import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const ticketsMulterOptions = {
  storage: diskStorage({
    destination: (_req: unknown, file: Express.Multer.File, callback) => {
      const req = _req as { params?: { id?: string } };
      const ticketId = req.params?.id;
      if (!ticketId) {
        callback(new BadRequestException('Ticket ID is required'), '');
        return;
      }

      const root = process.env.MEDIA_PATH ?? 'media';
      const destination = join(process.cwd(), root, 'tickets', ticketId);
      mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (_req: unknown, file: Express.Multer.File, callback) => {
      const extension = extname(file.originalname);
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};
