// routes/sitemap.js
const express = require('express');
const router = express.Router();
const Blog = require('../models/blog');

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const baseUrl = 'https://failstory.onrender.com';
    const posts = await Blog.find({ status: 'approved' }).select('_id updatedAt createdAt').lean();

    const urls = [
      { url: '/', changefreq: 'daily', priority: 1.0, lastmodISO: new Date().toISOString() },
      { url: '/about', changefreq: 'monthly', priority: 0.7 }
    ];

    posts.forEach(p => {
      urls.push({
        url: `/blogs/${p._id}`, // ✅ using _id instead of slug
        lastmodISO: (p.updatedAt || p.createdAt || new Date()).toISOString(),
        changefreq: 'weekly',
        priority: 0.8
      });
    });

    const xmlItems = urls.map(u => {
      const lastmod = u.lastmodISO ? `<lastmod>${u.lastmodISO}</lastmod>` : '';
      return `
        <url>
          <loc>${baseUrl}${u.url}</loc>
          ${lastmod}
          <changefreq>${u.changefreq}</changefreq>
          <priority>${u.priority}</priority>
        </url>`;
    }).join('');

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${xmlItems}
      </urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemapXml);
  } catch (err) {
    next(err);
  }
});

module.exports = router;