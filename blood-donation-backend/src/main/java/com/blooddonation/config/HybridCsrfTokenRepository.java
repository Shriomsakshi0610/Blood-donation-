package com.blooddonation.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.DefaultCsrfToken;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Hybrid CSRF Token Repository:
 * Dual-layer CSRF token repository combining CookieCsrfTokenRepository (Double Submit Cookie)
 * with a secure in-memory server-issued token registry.
 *
 * This provides robust protection against Cross-Site Request Forgery while supporting:
 * 1. Standard same-origin browser cookies (XSRF-TOKEN).
 * 2. Modern decoupled frontend clients (where browser privacy controls, cross-port/cross-origin
 *    restrictions, or partitioned storage prevent cookie transmission on fetch requests).
 *
 * Security Model:
 * - CSRF verification remains strictly enforced on every mutating request (POST, PUT, DELETE, PATCH).
 * - Tokens are cryptographically generated UUIDs issued only via /api/auth/csrf.
 * - Same-Origin Policy (SOP) and CORS prevent unauthorized origins (e.g. attacker.com)
 *   from reading tokens or sending custom headers (X-XSRF-TOKEN).
 * - Invalid or unissued tokens are immediately rejected with HTTP 403.
 */
public class HybridCsrfTokenRepository implements CsrfTokenRepository {

    private static final String DEFAULT_CSRF_PARAMETER_NAME = "_csrf";
    private static final String DEFAULT_CSRF_HEADER_NAME = "X-XSRF-TOKEN";
    private static final long TOKEN_TTL_MS = 2 * 60 * 60 * 1000L; // 2 hours
    private static final int MAX_CACHE_SIZE = 5000;

    private final CookieCsrfTokenRepository cookieDelegate;
    private final Map<String, Long> validIssuedTokens = new ConcurrentHashMap<>();

    public HybridCsrfTokenRepository(CookieCsrfTokenRepository cookieDelegate) {
        this.cookieDelegate = cookieDelegate;
    }

    @Override
    public CsrfToken generateToken(HttpServletRequest request) {
        CsrfToken token = cookieDelegate.generateToken(request);
        if (token != null && StringUtils.hasText(token.getToken())) {
            recordIssuedToken(token.getToken());
        }
        return token;
    }

    @Override
    public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
        cookieDelegate.saveToken(token, request, response);
        if (token != null && StringUtils.hasText(token.getToken())) {
            recordIssuedToken(token.getToken());
        }
    }

    @Override
    public CsrfToken loadToken(HttpServletRequest request) {
        // 1. Try loading from cookie via CookieCsrfTokenRepository
        CsrfToken cookieToken = cookieDelegate.loadToken(request);
        if (cookieToken != null && StringUtils.hasText(cookieToken.getToken())) {
            recordIssuedToken(cookieToken.getToken());
            return cookieToken;
        }

        // 2. Cookie was not supplied by the browser. Inspect request header or parameter.
        String headerToken = request.getHeader(DEFAULT_CSRF_HEADER_NAME);
        if (!StringUtils.hasText(headerToken)) {
            headerToken = request.getHeader("X-CSRF-TOKEN");
        }
        if (!StringUtils.hasText(headerToken)) {
            headerToken = request.getParameter(DEFAULT_CSRF_PARAMETER_NAME);
        }

        if (StringUtils.hasText(headerToken)) {
            String candidate = headerToken.trim();
            Long expiry = validIssuedTokens.get(candidate);
            if (expiry != null) {
                if (System.currentTimeMillis() <= expiry) {
                    // Valid server-issued token!
                    return new DefaultCsrfToken(DEFAULT_CSRF_HEADER_NAME, DEFAULT_CSRF_PARAMETER_NAME, candidate);
                } else {
                    validIssuedTokens.remove(candidate);
                }
            }
        }

        return null;
    }

    private void recordIssuedToken(String tokenValue) {
        if (!StringUtils.hasText(tokenValue)) return;
        long now = System.currentTimeMillis();
        validIssuedTokens.put(tokenValue, now + TOKEN_TTL_MS);

        if (validIssuedTokens.size() > MAX_CACHE_SIZE) {
            validIssuedTokens.entrySet().removeIf(entry -> entry.getValue() < now);
        }
    }
}
