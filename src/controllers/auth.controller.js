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

// Helper function to get client URL - FIXED
const getClientURL = () => {
  // Make sure these match your actual frontend URLs
  const devURL = process.env.CLIENT_DEV_URL || 'http://localhost:5173';
  const prodURL = process.env.CLIENT_PROD_URL || 'https://your-production-domain.com';
  
  return process.env.NODE_ENV === 'production' ? prodURL : devURL;
};

// Helper function to generate JWT
const generateJWT = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign(
    { id: userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

// Helper function to set secure cookie
const setAuthCookie = (res, token) => {
  res.cookie('jwt', token, {
    httpOnly: true,
    sameSite: 'lax', // Changed from 'strict' to 'lax' for cross-origin
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
};


// Helper function to send success response
const sendSuccessResponse = (res, user) => {
  const clientURL = getClientURL();
  
  console.log('Sending success response to:', clientURL);
  console.log('User data:', { id: user.id, email: user.email, name: user.name });
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Successful</title>
    </head>
    <body>
      <script>
        try {
          console.log('Attempting to send message to:', '${clientURL}');
          console.log('User data:', ${JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name || '',
            role: user.role,
            image: user.image || ''
          })});
          
          // Try multiple methods to communicate with parent window
          const messageData = {
            type: 'auth_success',
            user: {
              id: '${user.id}',
              email: '${user.email}',
              name: '${user.name || ''}',
              role: '${user.role}',
              image: '${user.image || ''}'
            }
          };
          
          // Method 1: Direct postMessage to opener
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(messageData, '${clientURL}');
            console.log('Message sent to opener');
          }
          
          // Method 2: Try to post to parent (for iframe scenarios)
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(messageData, '${clientURL}');
            console.log('Message sent to parent');
          }
          
          // Method 3: Broadcast to all origins (less secure but more compatible)
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(messageData, '*');
            console.log('Message sent to opener with wildcard origin');
          }
          
          // Close window after a short delay
          setTimeout(() => {
            window.close();
          }, 1000);
          
        } catch (error) {
          console.error('Error in popup script:', error);
          // Still try to close the window
          setTimeout(() => {
            try {
              window.close();
            } catch (closeError) {
              console.error('Could not close window:', closeError);
            }
          }, 2000);
        }
      </script>
      <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
        <h2>Authentication Successful!</h2>
        <p>You can close this window now.</p>
        <button onclick="window.close()">Close Window</button>
      </div>
    </body>
    </html>
  `);
};

// Helper function to send error response
const sendErrorResponse = (res, message = 'Authentication failed') => {
  const clientURL = getClientURL();
  
  console.log('Sending error response:', message);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authentication Failed</title>
    </head>
    <body>
      <script>
        try {
          const errorData = {
            type: 'auth_error',
            message: '${message}'
          };
          
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(errorData, '${clientURL}');
            window.opener.postMessage(errorData, '*'); // Fallback
          }
          
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(errorData, '${clientURL}');
          }
          
          setTimeout(() => {
            window.close();
          }, 2000);
          
        } catch (error) {
          console.error('Error in error popup script:', error);
          setTimeout(() => {
            try {
              window.close();
            } catch (closeError) {
              console.error('Could not close window:', closeError);
            }
          }, 3000);
        }
      </script>
      <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px; color: #721c24;">
        <h2>Authentication Failed</h2>
        <p>${message}</p>
        <button onclick="window.close()">Close Window</button>
      </div>
    </body>
    </html>
  `);
};

export const googleAuthCallback = async (req, res) => {
  try {
    console.log('Google auth callback triggered');
    
    if (!req.user) {
      console.error('No user object in request');
      return sendErrorResponse(res, 'Authentication data not found');
    }

    const googleProfile = req.user.profile || req.user;
    
    if (!googleProfile) {
      console.error('No Google profile found');
      return sendErrorResponse(res, 'Profile data not found');
    }

    const email = googleProfile.emails?.[0]?.value;
    const name = googleProfile.displayName;
    const image = googleProfile.photos?.[0]?.value;
    const googleId = googleProfile.id;

    console.log("Google Profile - Email:", email, "Name:", name);

    if (!email) {
      console.error('No email found in Google profile');
      return sendErrorResponse(res, 'Email not provided by Google');
    }

    if (!name) {
      console.error('No name found in Google profile');
      return sendErrorResponse(res, 'Name not provided by Google');
    }

    // Database operations
    let user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
      }
    });

    if (!user) {
      console.log('Creating new user for email:', email);
      
      user = await db.user.create({
        data: {
          email,
          name,
          image,
          role: UserRole.USER,
          password: '',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          image: true,
          createdAt: true,
        }
      });
      
      console.log('New user created with ID:', user.id);
    } else {
      console.log('Existing user found with ID:', user.id);
      
      // Update user info if needed
      const updates = {};
      if (name && user.name !== name) updates.name = name;
      if (image && user.image !== image) updates.image = image;
      
      if (Object.keys(updates).length > 0) {
        user = await db.user.update({
          where: { id: user.id },
          data: updates,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            image: true,
            createdAt: true,
          }
        });
      }
    }

    // Generate JWT and set cookie
    const token = generateJWT(user.id);
    setAuthCookie(res, token);
    
    // Send success response
    sendSuccessResponse(res, user);

  } catch (error) {
    console.error('Google Auth error:', error);
    
    if (error.code === 'P2002') {
      sendErrorResponse(res, 'User with this email already exists');
    } else if (error.name === 'JsonWebTokenError') {
      sendErrorResponse(res, 'Token generation failed');
    } else {
      sendErrorResponse(res, 'Authentication failed. Please try again.');
    }
  }
};


export const getMe = async (req, res) => {
  try {
    // The `req.user` is set by your authMiddleware, which likely verifies the JWT and attaches the user info
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No user info found',
      });
    }

    // You might want to refetch fresh data from DB, e.g. in case of updates (optional)
    const userDetails = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
      },
    });

    if (!userDetails) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
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
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user details',
    });
  }
};
