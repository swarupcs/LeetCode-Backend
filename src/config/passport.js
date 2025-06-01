import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../libs/db.js';
import jwt from 'jsonwebtoken';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      const { id, displayName, emails, photos } = profile;

      try {
        // Check if user already exists
        let user = await db.user.findUnique({
          where: { googleId: id },
        });

        if (!user) {
          // Check if email already exists (user registered using email/password)
          const existingUser = await db.user.findUnique({
            where: { email: emails[0].value },
          });

          if (existingUser) {
            // Optionally update their account to link Google
            user = await db.user.update({
              where: { email: emails[0].value },
              data: {
                googleId: id,
                image: photos[0]?.value,
              },
            });
          } else {
            // New user via Google
            user = await db.user.create({
              data: {
                googleId: id,
                name: displayName,
                email: emails[0].value,
                image: photos[0]?.value,
                password: 'google_oauth', // Placeholder
              },
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

 
export default passport;