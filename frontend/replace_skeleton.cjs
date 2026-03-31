const fs = require('fs');

const path = 'c:\\Visual Studio Projects\\Sandigan-Carwash-Web-app\\Sandigan\\frontend\\src\\pages\\admin\\AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('SkeletonLoaders')) {
    if (content.includes("import { API_BASE, authHeaders } from '../../api/config';")) {
        content = content.replace(
            "import { API_BASE, authHeaders } from '../../api/config';",
            "import { API_BASE, authHeaders } from '../../api/config';\nimport { PageSkeleton, ChartSkeleton, TableSkeleton } from '../../components/SkeletonLoaders';"
        );
    } else {
        content = "import { PageSkeleton, ChartSkeleton, TableSkeleton } from '../../components/SkeletonLoaders';\n" + content;
    }
}

// Replace page return loaders
content = content.replace(/if\s*\(\s*isLoading\s*\)\s*return\s*<div[^>]*>\s*<div\s+className="spinner-border\s+text-primary"[^>]*><\/div>\s*<\/div>\s*;/g, "if (isLoading) return <PageSkeleton />;");

// Replace inner inline spinners variants 
content = content.replace(/<div\s+className="p-5\s+text-center">\s*<div\s+className="spinner-border\s+text-primary"\s*\/>\s*<\/div>/g, "<div className=\"p-0\"><TableSkeleton /></div>");
content = content.replace(/<div\s+className="text-center\s+p-5">\s*<div\s+className="spinner-border\s+text-primary"\s*\/>\s*<\/div>/g, "<div className=\"p-0\"><TableSkeleton /></div>");

// Also check variants that don't self-close the spinner-border
content = content.replace(/<div\s+className="p-5\s+text-center">\s*<div\s+className="spinner-border\s+text-primary"><\/div>\s*<\/div>/g, "<div className=\"p-0\"><TableSkeleton /></div>");

// Chart loading
content = content.replace(/<div\s+className="d-flex\s+justify-content-center\s+align-items-center"\s+style=\{\{\s*height:\s*250\s*\}\}>\s*<div\s+className="spinner-border\s+text-primary"\s*\/>\s*<\/div>/g, "<ChartSkeleton />");

// Wait, let's catch standard text-center wrapping spinner
content = content.replace(/<div\s+className="text-center\s+p-4">\s*<div\s+className="spinner-border\s+text-primary\s+mb-3"\s+role="status"\s*\/>\s*(<span[^>]*>[^<]*<\/span>)?\s*<\/div>/g, "<div className=\"p-0 mt-3\"><TableSkeleton /></div>");

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced content effectively.');
