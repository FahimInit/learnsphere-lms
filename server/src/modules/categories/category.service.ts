import { Category, ICategoryDocument } from './category.model';
import { AppError } from '../../utils/AppError';
import { slugify } from '../../utils/slugify';
import { CreateCategoryInput, UpdateCategoryInput } from './category.validator';

const DEFAULT_CATEGORIES = [
  {
    name: 'Web Development',
    description: 'Full-stack web applications, modern frontend frameworks, and REST APIs',
    icon: 'Code',
  },
  {
    name: 'Data Science & AI',
    description: 'Machine learning, data engineering, and applied artificial intelligence',
    icon: 'Brain',
  },
  {
    name: 'Cloud & DevOps',
    description: 'Docker, Kubernetes, CI/CD pipelines, and cloud infrastructure',
    icon: 'Cloud',
  },
  {
    name: 'Software Architecture',
    description: 'System design, distributed systems, microservices, and clean architecture',
    icon: 'Layers',
  },
  {
    name: 'Cybersecurity',
    description: 'Application security, penetration testing, and secure coding practices',
    icon: 'Shield',
  },
];

export class CategoryService {
  async listCategories(includeInactive = false): Promise<ICategoryDocument[]> {
    const totalCount = await Category.countDocuments();
    if (totalCount === 0) {
      await this.seedDefaultCategories();
    }

    const filter = includeInactive ? {} : { isActive: true };
    return Category.find(filter).sort({ name: 1 });
  }

  async seedDefaultCategories(): Promise<void> {
    for (const item of DEFAULT_CATEGORIES) {
      const slug = slugify(item.name);
      await Category.findOneAndUpdate(
        { slug },
        {
          $setOnInsert: {
            name: item.name,
            slug,
            description: item.description,
            icon: item.icon,
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );
    }
  }

  async createCategory(input: CreateCategoryInput): Promise<ICategoryDocument> {
    const slug = slugify(input.name);
    const existing = await Category.findOne({
      $or: [{ slug }, { name: new RegExp(`^${input.name}$`, 'i') }],
    });

    if (existing) {
      throw AppError.conflict(`Category '${input.name}' already exists`);
    }

    const category = await Category.create({
      name: input.name,
      slug,
      description: input.description ?? '',
      icon: input.icon ?? 'BookOpen',
      isActive: input.isActive ?? true,
    });

    return category;
  }

  async updateCategory(
    id: string,
    input: UpdateCategoryInput
  ): Promise<ICategoryDocument> {
    const category = await Category.findById(id);
    if (!category) {
      throw AppError.notFound('Category not found');
    }

    if (input.name !== undefined && input.name !== category.name) {
      const newSlug = slugify(input.name);
      const duplicate = await Category.findOne({
        _id: { $ne: category._id },
        slug: newSlug,
      });
      if (duplicate) {
        throw AppError.conflict(`Category '${input.name}' already exists`);
      }
      category.name = input.name;
      category.slug = newSlug;
    }

    if (input.description !== undefined) category.description = input.description;
    if (input.icon !== undefined) category.icon = input.icon;
    if (input.isActive !== undefined) category.isActive = input.isActive;

    await category.save();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await Category.findById(id);
    if (!category) {
      throw AppError.notFound('Category not found');
    }

    if (category.courseCount > 0) {
      throw AppError.badRequest(
        'Cannot delete a category that has courses assigned to it. Deactivate it instead.'
      );
    }

    await category.deleteOne();
  }
}

export const categoryService = new CategoryService();
