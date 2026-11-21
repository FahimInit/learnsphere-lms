import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  Star,
  Clock,
  Users,
  FileText,
  Filter,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { CategoryItem, CourseItem } from '@/types/course';
import { PaginationMeta } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export function CourseCatalogPage(): React.ReactElement {
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [priceType, setPriceType] = useState<'all' | 'free' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<
    'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc'
  >('newest');
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data.categories;
    },
  });

  const { data: catalogData, isLoading } = useQuery<{
    courses: CourseItem[];
    meta: PaginationMeta;
  }>({
    queryKey: [
      'catalog-courses',
      appliedSearch,
      selectedCategory,
      selectedLevel,
      priceType,
      sortBy,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedSearch) params.set('q', appliedSearch);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedLevel) params.set('level', selectedLevel);
      if (priceType !== 'all') params.set('priceType', priceType);
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await apiClient.get(`/courses?${params.toString()}`);
      return {
        courses: res.data.data.courses,
        meta: res.data.meta,
      };
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setSelectedCategory('');
    setSelectedLevel('');
    setPriceType('all');
    setSortBy('newest');
    setPage(1);
  };

  const courses = catalogData?.courses || [];
  const meta = catalogData?.meta;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <Badge variant="default">Course Catalog</Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Explore Industry-Standard Courses
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Filter by engineering domain, difficulty level, and rating to find your next
            learning track
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="mt-4 flex flex-col gap-2 pt-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                aria-label="Search courses"
                placeholder="Search courses by title, technology, or topic..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <Button type="submit">Search Catalog</Button>
          </form>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat._id);
                setPage(1);
              }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === cat._id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Filter Bar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Filters:
          </div>

          <select
            aria-label="Filter by difficulty level"
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <select
            aria-label="Filter by price"
            value={priceType}
            onChange={(e) => {
              setPriceType(e.target.value as 'all' | 'free' | 'paid');
              setPage(1);
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Prices</option>
            <option value="free">Free Only</option>
            <option value="paid">Paid Courses</option>
          </select>

          {(appliedSearch || selectedCategory || selectedLevel || priceType !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Sort by:</span>
          <select
            aria-label="Sort courses"
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as
                  | 'newest'
                  | 'popular'
                  | 'rating'
                  | 'price_asc'
                  | 'price_desc'
              )
            }
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="newest">Newest Published</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Skeleton key={n} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="py-14 text-center">
          <CardContent className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              No matching courses found
            </h3>
            <p className="mx-auto max-w-md text-sm text-slate-500">
              Try adjusting your search keywords or clearing active filters.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card
                key={course._id}
                className="flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="default">
                      {course.category?.name || 'General'}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {course.level}
                    </Badge>
                  </div>

                  <div>
                    <Link
                      to={`/courses/${course.slug || course._id}`}
                      className="group"
                    >
                      <CardTitle className="line-clamp-2 text-lg group-hover:text-indigo-600 transition-colors">
                        {course.title}
                      </CardTitle>
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      By{' '}
                      <span className="font-medium text-slate-700">
                        {course.instructor?.name || 'LearnSphere Instructor'}
                      </span>
                    </p>
                  </div>

                  <CardDescription className="line-clamp-2">
                    {course.shortDescription}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {course.averageRating > 0
                        ? course.averageRating.toFixed(1)
                        : 'New'}
                    </span>
                    <span className="text-slate-400">
                      ({course.reviewCount} reviews)
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {course.enrollmentCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {course.totalLessonsCount} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(course.estimatedDurationMinutes)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-base font-bold text-slate-900">
                    {formatCurrency(course.price)}
                  </span>
                  <Link to={`/courses/${course.slug || course._id}`}>
                    <Button size="sm">View Course</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-3 text-xs font-medium text-slate-600">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
