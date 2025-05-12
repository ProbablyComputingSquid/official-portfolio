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
    <title>{{title}} - Jay's Projects</title>
    <link rel="shortcut icon" href="/assets/photos/square_photo.jpg" type="image/x-icon">
    <link rel="stylesheet" type="text/css" href="/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        .article-content {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .article-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1rem 0;
        }

        .article-content pre {
            background: var(--primary);
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
        }

        .article-content code {
            background: var(--primary);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
        }

        .article-content h1, .article-content h2, .article-content h3 {
            color: var(--accent);
            margin-top: 2rem;
        }

        .article-content a {
            color: var(--accent);
            text-decoration: none;
        }

        .article-content a:hover {
            text-decoration: underline;
        }

        .back-link {
            display: inline-block;
            margin: 1rem 0;
        }

        .back-link i {
            margin-right: 0.5rem;
        }

        .article-meta {
            color: var(--text);
            opacity: 0.8;
            margin-bottom: 2rem;
            font-style: italic;
        }
    </style>
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
            </div>
            {{content}}
        </div>
    </div>
</body>
</html>`;

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
                    metadata[key.trim()] = valueParts.join(':').trim();
                }
            });
        }

        // Convert markdown to HTML
        const htmlContent = marked(markdownContent);

        // Generate the final HTML
        const finalHtml = projectTemplate
            .replace('{{title}}', metadata.title || path.basename(filePath, '.md'))
            .replace('{{date}}', metadata.date || new Date().toLocaleDateString())
            .replace('{{content}}', htmlContent);

        // Determine output directory based on folder tag or file location
        let outputDir;
        if (metadata.folder) {
            outputDir = path.join('dist', metadata.folder);
        } else {
            // If no folder specified, use the relative path from content directory
            const relativePath = path.relative('content', path.dirname(filePath));
            outputDir = path.join('dist', relativePath);
        }
        
        await fs.ensureDir(outputDir);

        // Write the HTML file
        const outputPath = path.join(outputDir, path.basename(filePath, '.md') + '.html');
        await writeFile(outputPath, finalHtml);
        
        console.log(`Generated: ${outputPath}`);
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

async function build() {
    try {
        // Create content directory if it doesn't exist
        await fs.ensureDir('content');
        
        // Process all markdown files
        const files = await fs.readdir('content');
        for (const file of files) {
            if (file.endsWith('.md')) {
                await processMarkdownFile(path.join('content', file));
            }
        }
        
        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
    }
}

build(); 