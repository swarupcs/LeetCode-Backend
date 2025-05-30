import bcrypt from 'bcryptjs';
import { db } from '../libs/db.js';
import { UserRole } from '../generated/prisma/index.js';
import jwt from 'jsonwebtoken';


export const register = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.USER,
      },
    });

    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('jwt', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        image: newUser.image,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Error creating user',
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });

    console.log('user', user);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.cookie('jwt', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'User Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Error logging in user',
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV !== 'development',
    });

    res.status(200).json({
      success: true,
      message: 'User logged out successfully',
    });
  } catch (error) {
    console.error('Error logging out user:', error);
    res.status(500).json({
      error: 'Error logging out user',
    });
  }
};

export const check = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User authenticated successfully',
      user: req.user,
    });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({
      error: 'Error checking user',
    });
  }
};


export const getUserDetails = async (req, res) => {
  const userId = req.user.id;

  try {
  const userDetails = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      image: true,
      createdAt: true,
    }


  })

  console.log('userDetails', userDetails);

  res.status(200).json({
    success: true,
    message: 'User details fetched successfully',
    user: {
      id: userDetails.id,
      email: userDetails.email,
      username: userDetails.username,
      name: userDetails.name,
      role: userDetails.role,
      image: userDetails.image,
      createdAt: userDetails.createdAt,
    },
  });
    
  } catch (error) {
    
  }




}

export const googleAuthCallback = async (req, res) => {
  try {
    const googleProfile = req.user;

    // Extract profile details
    const email = googleProfile.emails?.[0]?.value;
    const name = googleProfile.displayName;
    const image = googleProfile.photos?.[0]?.value;

    console.log("googleProfile", googleProfile);
    console.log("email", email);
    console.log("name", name);

    if (!email) {
      return res
        .status(400)
        .json({ error: 'No email found in Google profile' });
    }

    // Check if user exists
    let user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user
      user = await db.user.create({
        data: {
          email,
          name,
          image,
          role: UserRole.USER,
          password: '', // no password for Google SSO
        },
      });
    }

    // Issue JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Set cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    console.log("user", user);

    // Redirect or send JSON
    // res.redirect(process.env.CLIENT_URL || '/');
    res.send(`
      <script>
        window.opener.postMessage('success', '${process.env.CLIENT_URL}');
        window.close();
      </script>
    `);

    
    // res.status(200).json({
    //   success: true,
    //   message: 'User authenticated successfully',
    //   user: {
    //     id: user.id,
    //     email: user.email,
    //     name: user.name,
    //     role: user.role,
    //     image: user.image,
    //   },
    // })
  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};
