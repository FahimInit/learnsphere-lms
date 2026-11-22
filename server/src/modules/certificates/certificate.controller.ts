import { Request, Response } from 'express';
import { certificateService } from './certificate.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class CertificateController {
  listMine = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const certificates = await certificateService.listMyCertificates(
      req.user.id
    );
    return sendSuccess(res, { certificates }, 'Certificates retrieved');
  });

  claim = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const certificate = await certificateService.claimCourseCertificate(
      req.params.courseId,
      req.user.id
    );
    return sendSuccess(
      res,
      { certificate },
      'Certificate verified and retrieved'
    );
  });

  verify = asyncHandler(async (req: Request, res: Response) => {
    const result = await certificateService.verifyCertificateByCode(
      req.params.code
    );
    return sendSuccess(res, result, 'Certificate is authentic and verified');
  });
}

export const certificateController = new CertificateController();
