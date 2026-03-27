import { useEffect, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { getBlogArticle, getBlogArticlesSorted, type BlogBlock } from '../content/blogArticles'
import { getSiteUrl } from '../utils/siteUrl'
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
  const bySlug = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getBlogArticle>>()
    getBlogArticlesSorted().forEach((a) => m.set(a.slug, a))
    return m
  }, [])

  const jsonLd = useMemo(() => {
    if (!article) return null
    const base = getSiteUrl().replace(/\/$/, '')
    const url = `${base}/blog/${article.slug}`
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: article.title,
          description: article.metaDescription,
          datePublished: article.date,
          dateModified: article.lastReviewed,
          author: { '@type': 'Organization', name: 'Colorizer' },
          publisher: { '@type': 'Organization', name: 'Colorizer' },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          keywords: article.keywords.join(', '),
        },
        {
          '@type': 'FAQPage',
          mainEntity: article.faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a,
            },
          })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
            { '@type': 'ListItem', position: 3, name: article.title, item: url },
          ],
        },
      ],
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
      articlePublishedTime: article.date,
      articleModifiedTime: article.lastReviewed,
      articleAuthor: 'Colorizer',
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
          <span className="blogArticleRead">Intent: {article.searchIntent.replace('-', ' ')}</span>
          <h1 className="blogArticleTitle" itemProp="headline">
            {article.title}
          </h1>
          <p className="blogArticleDeck" itemProp="description">
            {article.metaDescription}
          </p>
          <p className="blogQuickAnswerLabel">Quick answer</p>
          <p className="blogQuickAnswer">{article.quickAnswer}</p>
          <h2 className="blogProseH2">Primary question</h2>
          <p className="blogProseP">{article.primaryQuestion}</p>
          <h2 className="blogProseH2">Key takeaways</h2>
          <ul className="blogProseUl">
            {article.keyTakeaways.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2 className="blogProseH2">Who this is for</h2>
          <p className="blogProseP">{article.whoFor}</p>
          {article.steps && article.steps.length > 0 && (
            <>
              <h2 className="blogProseH2">Step-by-step</h2>
              <ul className="blogProseUl">
                {article.steps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {article.limitations && article.limitations.length > 0 && (
            <>
              <h2 className="blogProseH2">Limitations and what affects results</h2>
              <ul className="blogProseUl">
                {article.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
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
        <section className="blogFaqSection" aria-label="Article FAQ">
          <h2 className="blogProseH2">FAQ</h2>
          <dl className="blogFaqList">
            {article.faq.map((item) => (
              <div key={item.q} className="blogFaqItem">
                <dt className="blogFaqQ">{item.q}</dt>
                <dd className="blogFaqA">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
        {article.relatedSlugs.length > 0 && (
          <section className="blogRelatedSection" aria-label="Related guides">
            <h2 className="blogProseH2">Related guides</h2>
            <ul className="blogRelatedList">
              {article.relatedSlugs
                .map((relatedSlug) => bySlug.get(relatedSlug))
                .filter((entry): entry is NonNullable<typeof entry> => !!entry)
                .map((entry) => (
                  <li key={entry.slug}>
                    <Link to={`/blog/${entry.slug}`}>{entry.title}</Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
        <footer className="blogArticleFooter">
          <p className="blogCta">
            Ready to try Colorizer?{' '}
            {article.ctaVariant === 'pricing' ? (
              <Link to="/#pricing" className="blogCtaLink">
                Compare plans
              </Link>
            ) : article.ctaVariant === 'workspace' ? (
              <Link to="/dashboard/workspace" className="blogCtaLink">
                Open workspace
              </Link>
            ) : (
              <Link to="/register" className="blogCtaLink">
                Create account
              </Link>
            )}
          </p>
          <Link to="/blog" className="contentBack">
            ← All articles
          </Link>
        </footer>
      </article>
    </div>
  )
}
