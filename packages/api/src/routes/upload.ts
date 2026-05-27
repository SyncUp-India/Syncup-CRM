import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import fs from 'fs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { logAudit } from '../utils/audit';
import { notifyLeadAssigned } from '../services/notifications';
import { LeadType, CsvRow, ImportResult } from '@syncup/shared';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV and XLSX files are accepted'));
  },
});

function parseFile(filePath: string, ext: string): CsvRow[] {
  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse<CsvRow>(content, { header: true, skipEmptyLines: true });
    return result.data;
  } else {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<CsvRow>(ws);
  }
}

// Preview upload (validate without importing)
router.post('/preview', requireRole('super_admin', 'lead'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const rows = parseFile(req.file.path, ext);

  const preview: Array<{ row: number; data: CsvRow; errors: string[] }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    if (!row.Name?.trim()) errors.push('Name is required');
    if (!row.Company?.trim()) errors.push('Company is required');
    if (!row.Phone?.trim()) errors.push('Phone is required');

    preview.push({ row: i + 2, data: row, errors });
  }

  res.json({ success: true, data: { preview, total: rows.length, filePath: req.file.path } });
});

// Confirm import
router.post('/confirm', requireRole('super_admin', 'lead'), async (req: AuthRequest, res: Response) => {
  const { filePath, assignedToId } = req.body;

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(400).json({ success: false, error: 'File not found. Please re-upload.' });
  }

  const ext = path.extname(filePath).toLowerCase();
  const rows = parseFile(filePath, ext);

  const result: ImportResult = { imported: 0, failed: 0, errors: [] };

  // Fetch existing phones and emails for duplicate detection
  const existingPhones = new Set(
    (await prisma.lead.findMany({ select: { phone: true } })).map((l: { phone: string }) => l.phone)
  );
  const existingEmails = new Set(
    (await prisma.lead.findMany({ where: { email: { not: null } }, select: { email: true } }))
      .map((l: { email: string | null }) => l.email!)
  );

  const targetUserId = assignedToId || req.user!.id;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    if (!row.Name?.trim()) errors.push('Name is required');
    if (!row.Company?.trim()) errors.push('Company is required');
    if (!row.Phone?.trim()) errors.push('Phone is required');
    if (row.Phone && existingPhones.has(row.Phone.trim())) errors.push('Duplicate phone number');
    if (row.Email && existingEmails.has(row.Email.trim())) errors.push('Duplicate email');

    if (errors.length > 0) {
      result.failed += 1;
      result.errors.push({ row: i + 2, reason: errors.join(', '), data: row as unknown as Record<string, unknown> });
      continue;
    }

    const leadTypeRaw = row['Lead Type']?.toLowerCase().trim();
    const validTypes: LeadType[] = ['inbound', 'outbound', 'cold'];
    const leadType: LeadType = validTypes.includes(leadTypeRaw as LeadType)
      ? (leadTypeRaw as LeadType)
      : 'cold';

    try {
      const lead = await prisma.lead.create({
        data: {
          name: row.Name.trim(),
          designation: row.Designation?.trim(),
          company: row.Company.trim(),
          phone: row.Phone.trim(),
          email: row.Email?.trim() || null,
          leadType,
          assignedToId: targetUserId,
          source: 'sheet_upload',
        },
      });

      await prisma.activity.create({
        data: {
          leadId: lead.id,
          userId: req.user!.id,
          action: 'lead_created',
          details: `Lead imported from file by ${req.user!.name}`,
        },
      });

      existingPhones.add(row.Phone.trim());
      if (row.Email) existingEmails.add(row.Email.trim());
      result.imported += 1;

      if (assignedToId && assignedToId !== req.user!.id) {
        notifyLeadAssigned(assignedToId, lead.id, lead.name).catch(console.error);
      }
    } catch (err) {
      result.failed += 1;
      result.errors.push({ row: i + 2, reason: 'Database error', data: row as unknown as Record<string, unknown> });
    }
  }

  await logAudit(req.user!.id, 'Lead', 'bulk', 'import', undefined, {
    imported: result.imported,
    failed: result.failed,
  });

  // Clean up temp file
  fs.unlink(filePath, () => {});

  res.json({ success: true, data: result });
});

export default router;
