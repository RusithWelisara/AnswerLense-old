import helmet from 'helmet';
import environment from '../config/environment.js';

/**
 * Security middleware configuration
 * Implements various security headers and protections
 */

// Basic helmet configuration
const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      connectSrc: ["'self'", "https://api.openai.com"],
    },
    reportOnly: environment.isDevelopment(), // Only report in development
  },
  
  // Cross Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },
  
  // Frame Guard
  frameguard: {
    action: 'deny',
  },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['no-referrer', 'strict-origin-when-cross-origin'],
  },
  
  // X-XSS-Protection
  xssFilter: true,
};

// Apply different configurations based on environment
if (environment.isDevelopment()) {
  // Relax CSP for development
  helmetConfig.contentSecurityPolicy.directives.scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");
  helmetConfig.contentSecurityPolicy.directives.connectSrc.push("ws:", "wss:", "http:", "https:");
  
  // Disable HSTS in development
  helmetConfig.hsts = false;
}

// Create helmet middleware
export const securityMiddleware = helmet(helmetConfig);

/**
 * Additional security headers middleware
 */
export const additionalSecurityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // Clear Server header
  res.removeHeader('Server');
  
  next();
};

/**
 * API key validation middleware
 */
export const validateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey && environment.isProduction()) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      timestamp: new Date().toISOString(),
    });
  }
  
  // TODO: Implement API key validation logic
  // For now, just continue
  next();
};

export default {
  securityMiddleware,
  additionalSecurityHeaders,
  validateApiKey,
};