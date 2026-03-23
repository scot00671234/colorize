import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBlogArticlesSorted } from '../content/blogArticles'
import { setSeoMeta } from '../utils/seoMeta'

export default function Blog() {
  const articles = getBlogArticlesSorted()

  useEffect(() => {
    setSeoMeta({
      title: 'Blog - Colorizer | Photo Colorization & Restoration',
      description:
        'Updates and tips on AI photo colorization, restoring old scans, and organizing family archives with Colorizer.',
      path: '/blog',
      keywords:
        'ai photo colorizer, restore old photos, colorize black and white, vintage photos, photo archive, image restoration',
    })
  }, [])

  return (
    <div className="blogPage">
      <div className="blogHero">
        <h1 className="blogHeroTitle">Blog</h1>
        <p className="blogHeroLead">
          Notes on colorizing and restoring photos, organizing archives, and what is shipping next in Colorizer.
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
              <p className="blogCardExcerpt">{a.metaDescription}</p>
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
