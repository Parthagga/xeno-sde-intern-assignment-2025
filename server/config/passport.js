const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const pool = require('./database');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    const [existingUser] = await pool.execute(
      'SELECT * FROM users WHERE google_id = ?',
      [profile.id]
    );

    if (existingUser.length > 0) {
      return done(null, existingUser[0]);
    }

    // Create new user
    const [result] = await pool.execute(
      'INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)',
      [
        profile.id,
        profile.emails[0].value,
        profile.displayName,
        profile.photos[0]?.value
      ]
    );

    const newUser = {
      id: result.insertId,
      google_id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0]?.value
    };

    return done(null, newUser);
  } catch (error) {
    return done(error, null);
  }
}));

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'fallback_jwt_secret'
}, async (payload, done) => {
  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [payload.userId]
    );

    if (users.length > 0) {
      return done(null, users[0]);
    }

    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (users.length > 0) {
      return done(null, users[0]);
    }

    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
});

module.exports = passport;
