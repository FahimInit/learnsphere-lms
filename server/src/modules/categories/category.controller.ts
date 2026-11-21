import { Request, Response } from 'express';
import { categoryService } from './category.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

export class CategoryController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const includeInactive =
      req.query.includeInactive === 'true' && req.user?.role === 'admin';
    const categories = await categoryService.listCategories(includeInactive);
    return sendSuccess(res, { categories }, 'Categories retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.createCategory(req.body);
    return sendCreated(res, { category }, 'Category created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, { category }, 'Category updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await categoryService.deleteCategory(req.params.id);
    return sendSuccess(res, null, 'Category deleted successfully');
  });
}

export const categoryController = new CategoryController();
