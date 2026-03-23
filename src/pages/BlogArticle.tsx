import { useEffect, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { getBlogArticle, type BlogBlock } from '../content/blogArticles'
import { setSeoMeta } from '../utils/seoMeta'

function renderBlocks(blocks: BlogBlock[]) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'p':
        return (
          <p key={i} className="blogProseP">
            {b.text}
          </p>
        )
      case 'h2':
        return (
          <h2 key={i} className="blogProseH2">
            {b.text}
          </h2>
        )
      case 'h3':
        return (
          <h3 key={i} className="blogProseH3">
            {b.text}
          </h3>
        )
      case 'ul':
        return (
          <ul key={i} className="blogProseUl">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        )
      case 'blockquote':
        return (
          <blockquote key={i} className="blogProseQuote">
            {b.text}
          </blockquote>
        )
      default:
        return null
    }
  })
}

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getBlogArticle(slug) : undefined

  const jsonLd = useMemo(() => {
    if (!article || typeof window === 'undefined') return null
    const url = `${window.location.origin}/blog/${article.slug}`
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.metaDescription,
      datePublished: article.date,
      author: { '@type': 'Organization', name: 'Colorizer' },
      publisher: { '@type': 'Organization', name: 'Colorizer' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      keywords: article.keywords.join(', '),
    }
  }, [article])

  useEffect(() => {
    if (!article) return
    setSeoMeta({
      title: `${article.title} | Colorizer Blog`,
      description: article.metaDescription,
      path: `/blog/${article.slug}`,
      type: 'article',
      keywords: article.keywords.join(', '),
    })
  }, [article])

  if (!slug || !article) {
    return <Navigate to="/blog" replace />
  }

  return (
    <div className="blogPage blogArticlePage">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <article className="blogArticle" itemScope itemType="https://schema.org/Article">
        <meta itemProp="datePublished" content={article.date} />
        <header className="blogArticleHeader">
          <Link to="/blog" className="blogBreadcrumb">
            ← Blog
          </Link>
          <time className="blogArticleDate" dateTime={article.date}>
            {new Date(article.date + 'T12:00:00').toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <span className="blogArticleRead">{article.readTime} read</span>
          <h1 className="blogArticleTitle" itemProp="headline">
            {article.title}
          </h1>
          <p className="blogArticleDeck" itemProp="description">
            {article.metaDescription}
          </p>
          <div className="blogKeywords" aria-label="Topics">
            {article.keywords.map((k) => (
              <span key={k} className="blogKeyword">
                {k}
              </span>
            ))}
          </div>
        </header>
        <div className="blogProse" itemProp="articleBody">
          {renderBlocks(article.blocks)}
        </div>
        <footer className="blogArticleFooter">
          <p className="blogCta">
            Ready to try Colorizer?{' '}
            <Link to="/register" className="blogCtaLink">
              Get started free
            </Link>
          </p>
          <Link to="/blog" className="contentBack">
            ← All articles
          </Link>
        </footer>
      </article>
    </div>
  )
}
