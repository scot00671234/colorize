import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getBlogArticlesSorted } from '../content/blogArticles'
import { getSiteUrl } from '../utils/siteUrl'
import { setSeoMeta } from '../utils/seoMeta'

export default function Blog() {
  const articles = getBlogArticlesSorted()
  const listJsonLd = useMemo(() => {
    const base = getSiteUrl().replace(/\/$/, '')
    return {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Colorizer Blog',
      url: `${base}/blog`,
      blogPost: articles.map((a) => ({
        '@type': 'BlogPosting',
        headline: a.title,
        datePublished: a.date,
        dateModified: a.lastReviewed,
        description: a.metaDescription,
        url: `${base}/blog/${a.slug}`,
      })),
    }
  }, [articles])

  useEffect(() => {
    setSeoMeta({
      title: 'Blog - Colorizer | AI Photo Colorization Guides',
      description:
        'Updates and practical tips on AI photo colorization, scan prep, and organizing family archives with Colorizer.',
      path: '/blog',
      keywords:
        'ai photo colorizer, colorize black and white, vintage photos, photo archive, scan prep, image colorization',
    })
  }, [])

  return (
    <div className="blogPage">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <div className="blogHero">
        <h1 className="blogHeroTitle">Blog</h1>
        <p className="blogHeroLead">
          Notes on colorizing photos, preparing scans, organizing archives, and getting better results in Colorizer.
        </p>
      </div>
      <ul className="blogGrid">
        {articles.map((a) => (
          <li key={a.slug}>
            <article className="blogCard">
              <time className="blogCardDate" dateTime={a.date}>
                {new Date(a.date + 'T12:00:00').toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
              <h2 className="blogCardTitle">
                <Link to={`/blog/${a.slug}`}>{a.title}</Link>
              </h2>
              <p className="blogCardIntent">Intent: {a.searchIntent.replace('-', ' ')}</p>
              <p className="blogCardExcerpt">{a.metaDescription}</p>
              <p className="blogCardQuestion">{a.primaryQuestion}</p>
              <div className="blogCardFooter">
                <span className="blogCardRead">{a.readTime} read</span>
                <Link to={`/blog/${a.slug}`} className="blogCardReadMore">
                  Read article →
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <p className="blogBackWrap">
        <Link to="/" className="contentBack">
          ← Back to home
        </Link>
      </p>
    </div>
  )
}
