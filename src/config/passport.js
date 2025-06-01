import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// IMPORTANT: Use SERVER URL for callback, not CLIENT URL
// The callback URL must point to your backend server where the route is handled
const serverDevURL = process.env.SERVER_DEV_URL || 'http://localhost:5000';
const serverProdURL =
  process.env.SERVER_PROD_URL || 'https://your-backend-domain.com';

const serverURL =
  process.env.NODE_ENV === 'production' ? serverProdURL : serverDevURL;

// Correct callback URL - points to your backend server
const callbackURL = `${serverURL}/api/v1/auth/google/callback`;

console.log('callbackURL', callbackURL);
console.log('NODE_ENV', process.env.NODE_ENV);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
    },
    (accessToken, refreshToken, profile, done) => {
      // Pass additional data that might be useful later
      return done(null, {
        profile,
        accessToken,
        refreshToken,
      });
    }
  )
);

// Since you're using session: false in your routes,
// these serialize/deserialize functions are not strictly needed
// but keeping them for consistency and potential future use
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

export default passport;
