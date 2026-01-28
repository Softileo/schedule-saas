/**
 * MDX Infrastructure for Blog & Poradniki
 *
 * Obsługuje:
 * - /blog/[slug] - artykuły blogowe
 * - /poradniki/[...slug] - klastry poradnikowe (np. /poradniki/czas-pracy/nadgodziny)
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

// ========================================
// TYPES
// ========================================

export interface PostFrontmatter {
    title: string;
    description: string;
    date: string;
    author: string;
    category: string;
    tags: string[];
    image?: string;
    seo?: {
        keywords?: string[];
        canonical?: string;
    };
    schema?: string[];
    relatedPosts?: string[];
    published?: boolean;
}

export interface PostMeta extends PostFrontmatter {
    slug: string;
    readingTime: string;
    wordCount: number;
}

export interface Post extends PostMeta {
    content: string;
    source: string; // raw MDX source for next-mdx-remote
}

// ========================================
// CONFIGURATION
// ========================================

const CONTENT_DIR = path.join(process.cwd(), "content");
const BLOG_DIR = path.join(CONTENT_DIR, "blog");
const PORADNIKI_DIR = path.join(CONTENT_DIR, "poradniki");

// ========================================
// UTILITIES
// ========================================

/**
 * Get all MDX files from a directory recursively
 */
function getAllMdxFiles(dir: string, basePath: string = ""): string[] {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
            files.push(...getAllMdxFiles(fullPath, relativePath));
        } else if (entry.name.endsWith(".mdx")) {
            files.push(relativePath);
        }
    }

    return files;
}

/**
 * Parse MDX file and extract frontmatter + content
 */
function parseMdxFile(filePath: string): {
    frontmatter: PostFrontmatter;
    content: string;
} {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    return {
        frontmatter: data as PostFrontmatter,
        content,
    };
}

/**
 * Convert file path to slug
 * e.g., "czas-pracy/nadgodziny.mdx" -> ["czas-pracy", "nadgodziny"]
 */
function filePathToSlug(filePath: string): string[] {
    return filePath
        .replace(/\.mdx$/, "")
        .replace(/_index$/, "") // _index.mdx -> parent folder
        .split(path.sep)
        .filter(Boolean);
}

// ========================================
// BLOG FUNCTIONS
// ========================================

/**
 * Get all blog posts
 */
export async function getAllBlogPosts(): Promise<PostMeta[]> {
    const files = getAllMdxFiles(BLOG_DIR);

    const posts: PostMeta[] = files
        .map((file) => {
            const fullPath = path.join(BLOG_DIR, file);
            const { frontmatter, content } = parseMdxFile(fullPath);
            const slug = file.replace(/\.mdx$/, "");
            const stats = readingTime(content);

            return {
                ...frontmatter,
                slug,
                readingTime: stats.text,
                wordCount: stats.words,
            };
        })
        .filter((post) => post.published !== false) // Exclude unpublished
        .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

    return posts;
}

/**
 * Get single blog post by slug
 */
export async function getBlogPost(slug: string): Promise<Post | null> {
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);
    const stats = readingTime(content);

    return {
        ...(data as PostFrontmatter),
        slug,
        readingTime: stats.text,
        wordCount: stats.words,
        content,
        source: fileContent,
    };
}

/**
 * Get blog post slugs for static generation
 */
export async function getBlogSlugs(): Promise<string[]> {
    const files = getAllMdxFiles(BLOG_DIR);
    return files.map((file) => file.replace(/\.mdx$/, ""));
}

// ========================================
// PORADNIKI FUNCTIONS
// ========================================

export interface PoradnikMeta extends PostMeta {
    slugPath: string[]; // e.g., ["czas-pracy", "nadgodziny"]
    isIndex: boolean; // true for _index.mdx (pillar pages)
    cluster?: string; // e.g., "czas-pracy"
}

/**
 * Get all poradniki
 */
export async function getAllPoradniki(): Promise<PoradnikMeta[]> {
    const files = getAllMdxFiles(PORADNIKI_DIR);

    const poradniki: PoradnikMeta[] = files
        .map((file) => {
            const fullPath = path.join(PORADNIKI_DIR, file);
            const { frontmatter, content } = parseMdxFile(fullPath);
            const slugParts = filePathToSlug(file);
            const isIndex = file.endsWith("_index.mdx");
            const stats = readingTime(content);

            // Determine cluster from first path segment
            const cluster = slugParts.length > 0 ? slugParts[0] : undefined;

            return {
                ...frontmatter,
                slug: slugParts.join("/"),
                slugPath: slugParts,
                readingTime: stats.text,
                wordCount: stats.words,
                isIndex,
                cluster,
            };
        })
        .filter((post) => post.published !== false)
        .sort((a, b) => {
            // Index pages first, then by date
            if (a.isIndex && !b.isIndex) return -1;
            if (!a.isIndex && b.isIndex) return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

    return poradniki;
}

/**
 * Get single poradnik by slug path
 */
export async function getPoradnik(slugPath: string[]): Promise<Post | null> {
    // Try both direct file and _index.mdx
    const directPath = path.join(PORADNIKI_DIR, ...slugPath) + ".mdx";
    const indexPath = path.join(PORADNIKI_DIR, ...slugPath, "_index.mdx");

    let filePath = "";
    if (fs.existsSync(directPath)) {
        filePath = directPath;
    } else if (fs.existsSync(indexPath)) {
        filePath = indexPath;
    } else {
        return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);
    const stats = readingTime(content);

    return {
        ...(data as PostFrontmatter),
        slug: slugPath.join("/"),
        readingTime: stats.text,
        wordCount: stats.words,
        content,
        source: fileContent,
    };
}

/**
 * Get all poradniki slugs for static generation
 */
export async function getPoradnikiSlugs(): Promise<string[][]> {
    const files = getAllMdxFiles(PORADNIKI_DIR);
    return files
        .map((file) => filePathToSlug(file))
        .filter((slug) => slug.length > 0);
}

/**
 * Alias for getPoradnikiSlugs for backwards compatibility
 */
export function getAllPoradnikiPaths(): string[][] {
    const files = getAllMdxFiles(PORADNIKI_DIR);
    return files
        .map((file) => filePathToSlug(file))
        .filter((slug) => slug.length > 0);
}

/**
 * Get poradniki by cluster
 */
export async function getPoradnikiByCluster(
    cluster: string
): Promise<PoradnikMeta[]> {
    const all = await getAllPoradniki();
    return all.filter((p) => p.cluster === cluster);
}

// ========================================
// RELATED POSTS
// ========================================

/**
 * Get related posts by tags or category
 */
export async function getRelatedPosts(
    currentSlug: string,
    category?: string,
    tags?: string[],
    limit: number = 3
): Promise<PostMeta[]> {
    const allPosts = await getAllBlogPosts();

    return allPosts
        .filter((post) => post.slug !== currentSlug)
        .filter((post) => {
            if (category && post.category === category) return true;
            if (tags && tags.some((tag) => post.tags?.includes(tag)))
                return true;
            return false;
        })
        .slice(0, limit);
}

// ========================================
// CATEGORIES & TAGS
// ========================================

export interface CategoryCount {
    name: string;
    count: number;
}

/**
 * Get all categories with counts
 */
export async function getCategories(): Promise<CategoryCount[]> {
    const posts = await getAllBlogPosts();
    const counts: Record<string, number> = {};

    posts.forEach((post) => {
        if (post.category) {
            counts[post.category] = (counts[post.category] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Get all tags with counts
 */
export async function getTags(): Promise<CategoryCount[]> {
    const posts = await getAllBlogPosts();
    const counts: Record<string, number> = {};

    posts.forEach((post) => {
        post.tags?.forEach((tag) => {
            counts[tag] = (counts[tag] || 0) + 1;
        });
    });

    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}
