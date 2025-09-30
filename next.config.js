const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental.appDir은 NextJS 13.4+에서 기본적으로 활성화됨
}

module.exports = withPWA(nextConfig)
