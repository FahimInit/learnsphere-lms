import { Router } from 'express';
import { certificateController } from './certificate.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Public verification endpoint
router.get('/verify/:code', certificateController.verify);

// Authenticated student certificate endpoints
router.get('/my-certificates', authenticate, certificateController.listMine);
router.post(
  '/courses/:courseId/claim',
  authenticate,
  certificateController.claim
);

export default router;
