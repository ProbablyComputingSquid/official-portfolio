const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configure marked for security
marked.setOptions({
    headerIds: false,
    mangle: false
});

// Template for project pages
const projectTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{excerpt}}">
    <meta name="keywords" content="{{tags}}">
    <meta name="author" content="Jacob Bolling">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="{{title}} - Jay's Portfolio & Blog">
    <meta property="og:url" content="https://jay.loves-being-a.dev{{url}}">
    <meta property="og:description" content="{{excerpt}}">
    <!--<meta property="og:image" content="https://jay.loves-being-a.dev/assets/photos/square_photo.jpg">-->
    <meta property="article:published_time" content="{{date}}">
   
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{title}} - Jay's Portfolio & Blog">
    <meta name="twitter:description" content="{{excerpt}}">
    <!--<meta name="twitter:image" content="https://jay.loves-being-a.dev/assets/photos/square_photo.jpg">-->
    <meta name="twitter:creator" content="@computingsquid">
    
    <title>{{title}} - Jay's Portfolio & Blog</title>
    <link rel="shortcut icon" href="/assets/photos/square_photo.jpg" type="image/x-icon">
    <link rel="stylesheet" type="text/css" href="/style.css">
    <link rel="stylesheet" type="text/css" href="/blog/posts.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">
            <i class="fas fa-arrow-left"></i> Back to Home
        </a>
        <div class="article-content">
            <h1>{{title}}</h1>
            <div class="article-meta">
                {{date}}
                {{#if category}}
                <span style="margin: 0 0.5rem">•</span>
                Category: {{category}}
                {{/if}}
                {{#if tags}}
                <div class="article-tags">
                    {{#each tags}}
                    <span class="article-tag">{{this}}</span>
                    {{/each}}   
                </div>
                {{/if}}
            </div>
            {{content}}
            
        </div>
    </div>
</body>
</html>`;

// Blog index template
const blogIndexTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - Jay's Portfolio & Blog</title>
    <link rel="shortcut icon" href="/assets/photos/square_photo.jpg" type="image/x-icon">
    <link rel="stylesheet" type="text/css" href="/style.css">
    <link rel="stylesheet" type="text/css" href="/blog/blog.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">
            <i class="fas fa-arrow-left"></i> Back to Home
        </a>

        <header>
            <h1>Blog</h1>
            <p class="tagline">Thoughts, tutorials, and updates on my projects</p>
        </header>

        <div class="blog-categories">
            <a href="#" class="category-link active" data-category="all">All</a>
            {{categories}}
        </div>

        <div class="blog-grid">
            {{posts}}
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const categoryLinks = document.querySelectorAll('.category-link');
            const blogCards = document.querySelectorAll('.blog-card');

            categoryLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const category = link.dataset.category;

                    // Update active state
                    categoryLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    // Filter cards
                    blogCards.forEach(card => {
                        if (category === 'all' || card.dataset.category === category) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                });
            });
        });
    </script>
</body>
</html>`;

// Helper function to estimate read time
function estimateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
}

// Helper function to get excerpt
function getExcerpt(content, maxLength = 150) {
    // Remove markdown syntax including images
    const plainText = content
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove markdown images ![alt](url)
        .replace(/\[.*?\]\(.*?\)/g, '')  // Remove markdown links [text](url)
        .replace(/[#*`_]/g, '');         // Remove other markdown syntax
    return plainText.length > maxLength 
        ? plainText.substring(0, maxLength) + '...'
        : plainText;
}

async function processMarkdownFile(filePath) {
    try {
        // Read the markdown file
        const content = await readFile(filePath, 'utf8');
        
        // Extract frontmatter (if any)
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        let metadata = {};
        let markdownContent = content;
        
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            markdownContent = frontmatterMatch[2];
            
            // Parse frontmatter
            frontmatter.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length) {
                    const value = valueParts.join(':').trim();
                    // Handle arrays (tags)
                    if (key.trim() === 'tags') {
                        metadata[key.trim()] = value.split(',').map(tag => tag.trim());
                    } else {
                        metadata[key.trim()] = value;
                    }
                }
            });
        }

        // Convert markdown to HTML
        const htmlContent = marked(markdownContent);

        // Determine output directory based on folder tag or file location
        let outputDir = 'blog';
        if (metadata.folder) {
            outputDir = path.join('blog', metadata.folder);
        }
        await fs.ensureDir(outputDir);

        // Define output path before using it
        const outputPath = path.join(outputDir, path.basename(filePath, '.md') + '.html');

        // Generate the final HTML
        const finalHtml = projectTemplate
            .replaceAll('{{title}}', metadata.title || path.basename(filePath, '.md'))
            .replaceAll('{{date}}', metadata.date || new Date().toLocaleDateString())
            .replaceAll('{{category}}', metadata.category || '')
            .replaceAll('{{content}}', htmlContent)
            .replaceAll('{{excerpt}}', getExcerpt(markdownContent))
            .replaceAll('{{url}}', '/' + path.relative('.', outputPath).replace(/\\/g, '/'))
            .replaceAll('{{#if category}}', metadata.category ? '' : '<!--')
            .replaceAll('{{/if}}', metadata.category ? '' : '-->')
            .replaceAll('{{#if tags}}', metadata.tags ? '' : '<!--')
            .replaceAll('{{/if}}', metadata.tags ? '' : '-->')
            .replaceAll('{{#each tags}}', metadata.tags ? '' : '<!--')
            .replaceAll('{{/each}}', metadata.tags ? '' : '-->')
            .replaceAll('{{this}}', metadata.tags ? metadata.tags.join('</span><span class="article-tag">') : '')
            .replaceAll('{{tags}}', metadata.tags ? metadata.tags.join(', ') : '');

        // Write the HTML file
        await writeFile(outputPath, finalHtml);
        
        console.log(`Generated: ${outputPath}`);

        // Return metadata for blog index
        return {
            title: metadata.title || path.basename(filePath, '.md'),
            date: metadata.date || new Date().toLocaleDateString(),
            category: metadata.category,
            tags: metadata.tags,
            excerpt: getExcerpt(markdownContent),
            readTime: estimateReadTime(markdownContent),
            url: '/' + path.relative('.', outputPath).replace(/\\/g, '/')
        };
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        return null;
    }
}

async function build() {
    try {
        // Create content directory if it doesn't exist
        await fs.ensureDir('content');
        
        // Process all markdown files
        const files = await fs.readdir('content');
        const posts = [];
        const categories = new Set();

        for (const file of files) {
            if (file.endsWith('.md')) {
                const post = await processMarkdownFile(path.join('content', file));
                if (post) {
                    posts.push(post);
                    if (post.category) {
                        categories.add(post.category);
                    }
                }
            }
        }

        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Generate blog index
        const categoriesHtml = Array.from(categories)
            .map(cat => `<a href="#" class="category-link" data-category="${cat}">${cat}</a>`)
            .join('\n');

        const postsHtml = posts.map(post => `
            <div class="blog-card" data-category="${post.category || 'uncategorized'}">
                <div class="blog-header">
                    <h2 class="blog-title">${post.title}</h2>
                    <div class="blog-meta">
                        <i class="far fa-calendar"></i> ${post.date}
                        ${post.readTime ? `<span style="margin: 0 0.5rem">•</span>
                        <i class="far fa-clock"></i> ${post.readTime} min read` : ''}
                    </div>
                </div>
                <p class="blog-excerpt">${post.excerpt}</p>
                ${post.tags ? `<div class="blog-tags">
                    ${post.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('\n')}
                </div>` : ''}
                <a href="${post.url}" class="read-more">
                    Read More <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        `).join('\n');

        const blogIndex = blogIndexTemplate
            .replace('{{categories}}', categoriesHtml)
            .replace('{{posts}}', postsHtml);

        // Write blog index
        await fs.ensureDir('blog');
        await writeFile(path.join('blog', 'index.html'), blogIndex);
        console.log('Generated blog index');
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
    }
}

build(); 