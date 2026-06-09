const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/users");
const Restaurant = require("../models/restaurants");
const authMiddleWare = require("../authMiddleWare/authMiddleWare");

const router = express.Router();

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

router.post("/signup-owner", authMiddleWare, async (req, res) => {
    if(req.user.role !== "admin"){
        return res.status(403).json({
            success: false,
            message: "Only admins can create restaurant owners",
        });
    }
    

  try {
    const {
      name,
      email,
      phone,
      restaurantName,
      restaurantAddress,
      restaurantPhone,
      monthlyCharge,
    } = req.body;


    if (
      !name ||
     !restaurantName ||
      !restaurantAddress ||
      !monthlyCharge ||
      !phone ||

      !restaurantPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, email, password, restaurantName, restaurantAddress, monthlyCharge, phone, and restaurantPhone are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ phone }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this phone already exists",
      });
    }




    const hashedPassword = await bcrypt.hash(phone, 10);

    const newUser = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "user",
    });
    const newRestaurant = await Restaurant.create({
      name: restaurantName || `${name}'s Restaurant`,
      address: restaurantAddress,
      phone: restaurantPhone ,
        owner: newUser._id,
        monthlyCharge: monthlyCharge,
    });

    await newRestaurant.save();

    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.status(201).json({
      success: true,
      message: "Owner and restaurant created successfully",
        token,
        user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            restaurantId: newRestaurant._id,
        },
    });
  } catch (error) {
    console.error("Signup Owner Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= SIGNUP =============
// Public route - anyone can sign up
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password,} = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { name  }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or name already exists",
      });
    }
 

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


router.post("/login", async (req, res) => {
  try {
    const {password , phone} = req.body;

    // Validation
    if ( !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone and password are required",
      });
    }
    const isAdminLogin = await User.findOne({ phone, role: "admin" });
    if (isAdminLogin) {
      const isPasswordValid = await bcrypt.compare(password, isAdminLogin.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid password",
        });
      }
      const token = jwt.sign(
        { userId: isAdminLogin._id, phone: isAdminLogin.phone, role: isAdminLogin.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );
      return res.status(200).json({
        success: true,
        message: "Admin login successful",
        token,
        user: {
          id: isAdminLogin._id,
          name: isAdminLogin.name,
          phone: isAdminLogin.phone,
          role: isAdminLogin.role,
          test: "This is admin login",
        },
      });
    }

    // Find user by phone
    const user = await User.findOne({ phone , role: "user" });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid phone or no owner account found with this phone",
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid  password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    const restInfo = await Restaurant.findOne({ owner: user._id });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
          restid: restInfo?._id || null,
    restname: restInfo?.name || null,
    restaddress: restInfo?.address || null,
    restphone: restInfo?.phone || null,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET USER PROFILE =============
// Protected route - requires authentication
// router.get("/profile", authMiddleWare, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.userId)
//       .populate("restaurantId")
//       .select("-passwordHash");

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       user,
//     });
//   } catch (error) {
//     console.error("Get Profile Error:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// ============= EDIT USER =============
// Protected route - user can only edit their own profile or admin can edit others
// router.put("/edit/:userId", authMiddleWare, async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { name, email, role, password } = req.body;
//     const currentUserId = req.user.userId;
//     const currentUserRole = req.user.role;

//     // Authorization check: user can edit their own profile or admin/owner can edit others
//     if (
//       userId !== currentUserId &&
//       currentUserRole !== "Owner" &&
//       currentUserRole !== "Admin"
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "You don't have permission to edit this user",
//       });
//     }

//     // Check if user exists
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Update name if provided and check for uniqueness
//     if (name && name !== user.name) {
//       const existingUser = await User.findOne({ name });
//       if (existingUser) {
//         return res.status(400).json({
//           success: false,
//           message: "Name already exists",
//         });
//       }
//       user.name = name;
//     }

//     // Update email if provided and check for uniqueness
//     if (email && email !== user.email) {
//       const existingUser = await User.findOne({ email });
//       if (existingUser) {
//         return res.status(400).json({
//           success: false,
//           message: "Email already exists",
//         });
//       }
//       user.email = email;
//     }

//     // Update password if provided
//     if (password) {
//       user.password = await bcrypt.hash(password, 10);
//     }

//     // Update role - only Owner/Admin can do this
//     if (role && (currentUserRole === "Owner" || currentUserRole === "Admin")) {
//       user.role = role;
//     }

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "User updated successfully",
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         restaurantId: user.restaurantId,
//       },
//     });
//   } catch (error) {
//     console.error("Edit User Error:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

// ============= DELETE USER =============
// Protected route - only Owner/Admin can delete users
router.delete("/delete/:userId", authMiddleWare, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserRole = req.user.role;
    const currentUserId = req.user.userId;

    // Authorization check: only Owner or Admin can delete users
    if (currentUserRole !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only  Admin can delete users",
      });
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============= GET ALL USERS (Admin only) =============
// Protected route - only Owner/Admin can view all users
router.get("/all", authMiddleWare, async (req, res) => {
  try {
    const currentUserRole = req.user.role;

    // Authorization check
    if (currentUserRole !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin can view all users",
      });
    }

    const users = await User.find()
      .populate("name email role")
      .select("-passwordHash");

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/getRestaurant/:id", authMiddleWare, async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    res.status(200).json({
      success: true,
      data : restaurant,
    });
  } catch (error) {
    console.error("Get Restaurant Info Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
