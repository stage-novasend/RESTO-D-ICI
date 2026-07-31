const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.jsx', 'utf8');
content = content.replace(/import \{ useNavigate \} from "react-router-dom";/, 'import { useNavigate, Link } from "react-router-dom";');

// We need to carefully replace <a href="/something"> ... </a> with <Link to="/something"> ... </Link>
// We can use a regex that matches <a href="/...">.*?</a>
// Since HTML can span multiple lines, we'll use [\s\S]*?
content = content.replace(/<a href="(\/[^"]*)"([\s\S]*?)<\/a>/g, '<Link to="$1"$2</Link>');

fs.writeFileSync('src/pages/Home.jsx', content);
