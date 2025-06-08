import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { db } from '../libs/db.js';
import jwt from 'jsonwebtoken';


// Helper function to generate unique username by adding suffix if needed
async function generateUniqueUsername(baseUsername) {
  let username = baseUsername;
  let suffix = 0;

  // Check if username exists
  while (true) {
    const existing = await db.user.findUnique({
      where: { username },
    });
    if (!existing) {
      // Not found, username is unique
      return username;
    }
    suffix++;
    username = `${baseUsername}${suffix}`;
  }
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      const { id, displayName, emails, photos } = profile;

      const email = emails[0].value;
      const baseUsername = email.split('@')[0];

      try {
        // Check if user already exists
        let user = await db.user.findUnique({
          where: { googleId: id },
        });

        if (!user) {
          // Check if email already exists (user registered using email/password)
          const existingUser = await db.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            // Optionally update their account to link Google
            user = await db.user.update({
              where: { email: emails[0].value },
              data: {
                googleId: id,
                image: photos[0]?.value,
                // Add username if missing:
                username:
                  existingUser.username ||
                  (await generateUniqueUsername(baseUsername)),
              },
            });
          } else {
            // New user via Google: create with unique username
            const username = await generateUniqueUsername(baseUsername);
            user = await db.user.create({
              data: {
                googleId: id,
                name: displayName,
                email: emails[0].value,
                image: photos[0]?.value,
                password: 'google_oauth', // Placeholder
                username,
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