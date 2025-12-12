/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://tuckandtale.com',
  generateRobotsTxt: true,
  exclude: [
    '/dashboard/*',
    '/auth/*',
    '/onboarding/*',
    '/test-stripe',
  ],
  robotsTxtOptions: {
    additionalSitemaps: [],
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/auth', '/onboarding', '/test-stripe'],
      },
    ],
  },
}
