import jwt from "jsonwebtoken";
import { db } from "../libs/db.js";

/**
 This is an authentication middleware function in JavaScript. 
 It checks if a user is authenticated by verifying a JSON Web Token (JWT) stored in a cookie. 
The middleware performs the following steps:
  1. It checks if a JWT token is present in the request cookies.
  2. If no token is found, it returns a 401 Unauthorized response.
  3. If a token is found, it verifies the token using a secret key (process.env.JWT_SECRET).
  4. If the token is invalid, it returns a 401 Unauthorized response.
  5. If the token is valid, it uses the decoded token to find the corresponding user in the database.
  6. If no user is found, it returns a 404 Not Found response.
  7. If a user is found, it assigns the user object to the request (req.user) and calls the next middleware function (next()).
In summary, this middleware function authenticates users by verifying a JWT token and retrieves the corresponding user data from the database.
 */
export const authMiddleware = async (req, res, next) => { 
    try {
        const token = req.cookies.jwt;

        if(!token) {
            return res.status(401).json({
                message: "Unauthorized - No token provided"
            })
        }

        let decoded;

        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
          return res.status(401).json({
            message: "Unauthorized - Invalid token",
          });
        }

        const user = await db.user.findUnique({
          where: {
            id: decoded.id,
          },
          select: {
            id: true,
            image: true,
            name: true,
            email: true,
            role: true,
          },
        });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        req.user = user;
        next();
        
    } catch (error) {

         console.error("Error authenticating user:", error);
         res.status(500).json({ message: "Error authenticating user" });
        
    }
}

/**
 This middleware function `checkAdmin` is used to restrict access to certain routes to admin users only. 
 Here's a breakdown of what it does:

1. Extracts user ID: It gets the `userId` from `req.user.id`. 
    This assumes that a previous middleware (like an authentication middleware) has already verified 
      the user and attached their info to the request.

2. Fetches user role from database: It uses Prisma to find the user by ID and select only their `role`.

3. Checks the role:

   - If the user doesn't exist or their role isn't `"ADMIN"`, it returns a 403 Forbidden response.
   - If the user `is an admin`, it calls `next()` to pass control to the next middleware or route handler.

4. Handles errors: If something goes wrong during the process (like a database error), 
    it catches the error, logs it, and returns a 500 Internal Server Error response.


 */

export const checkAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
      },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Access denied - Admins only",
      });
    }

    next();
  } catch (error) {
    console.error("Error checking admin role:", error);
    res.status(500).json({ message: "Error checking admin role" });
  }
};