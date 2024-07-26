import express from "express";
import { setupDatabase } from "../database/db.js";

const router = express.Router();

router.use(express.json());

// CREATE USER
router.post("/api/users", async (req, res) => {
  try {
    const db = await setupDatabase();
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const existingUser = await db.get(
      "SELECT id, username FROM users WHERE username = ?",
      [username]
    );
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const result = await db.run("INSERT INTO users (username) VALUES (?)", [
      username,
    ]);

    const insertedUser = { username, _id: result.lastID.toString() };

    res.json(insertedUser);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(400).json({ error: "User already exists" });
  }
});

// GET ALL USERS
router.get("/api/users", async (req, res) => {
  try {
    const db = await setupDatabase();
    const users = await db.all("SELECT id, username FROM users");

    if (users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }

    const formattedUsers = users.map((user) => ({
      username: user.username,
      _id: user.id.toString(),
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADD EXERCISE
router.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const db = await setupDatabase();

    const userId = req.params._id;
    const { description, duration, date } = req.body;

    // Check if the user exists
    const user = await db.get("SELECT username FROM users WHERE id = ?", [
      userId,
    ]);
    if (!user) {
      return res.status(400).json({ error: "User ID does not exist" });
    }

    if (!description || !duration) {
      return res
        .status(400)
        .json({ error: "Description and duration are required" });
    }

    if (isNaN(duration) || duration <= 0) {
      return res
        .status(400)
        .json({ error: "Duration must be a positive number" });
    }

    let exerciseDate;
    if (date) {
      exerciseDate = new Date(date);
      if (isNaN(exerciseDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
    } else {
      exerciseDate = new Date();
    }

    const result = await db.run(
      "INSERT INTO exercises (user_id, description, duration, date) VALUES (?, ?, ?, ?)",
      [userId, description, duration, exerciseDate.toISOString().split("T")[0]]
    );

    const insertedExercise = {
      _id: userId,
      username: user.username,
      description,
      duration: parseInt(duration),
      date: exerciseDate.toDateString(),
    };

    res.json(insertedExercise);
  } catch (error) {
    console.error("Error adding exercise:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET USER LOGS (OPTIONAL LIMIT, FROM, TO)
router.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const db = await setupDatabase();
    const userId = req.params._id;
    const user = await db.get("SELECT username FROM users WHERE id = ?", [
      userId,
    ]);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    let { from, to, limit } = req.query;
    let exercisesQuery =
      "SELECT description, duration, date FROM exercises WHERE user_id = ?";
    let countQuery =
      "SELECT COUNT(*) as count FROM exercises WHERE user_id = ?";
    let params = [userId];

    if (from && to) {
      exercisesQuery += " AND date BETWEEN ? AND ?";
      countQuery += " AND date BETWEEN ? AND ?";
      params.push(from, to);
    } else if (from) {
      exercisesQuery += " AND date >= ?";
      countQuery += " AND date >= ?";
      params.push(from);
    } else if (to) {
      exercisesQuery += " AND date <= ?";
      countQuery += " AND date <= ?";
      params.push(to);
    }

    const countResult = await db.get(countQuery, params);
    const count = countResult.count;

    exercisesQuery += " ORDER BY date ASC";
    if (limit) {
      exercisesQuery += " LIMIT ?";
      params.push(parseInt(limit));
    }

    const exercises = await db.all(exercisesQuery, params);

    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: parseInt(exercise.duration),
      date: new Date(exercise.date).toDateString(),
    }));

    const response = {
      username: user.username,
      count: count,
      _id: userId,
      log,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting exercise log:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET USER LOGS
// router.get("/api/users/:_id/logs", async (req, res) => {
//   try {
//     const db = await setupDatabase();
//     const userId = req.params._id;
//     const user = await db.get("SELECT username FROM users WHERE id = ?", [
//       userId,
//     ]);

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const exercises = await db.all(
//       "SELECT description, duration, date FROM exercises WHERE user_id = ?",
//       [userId]
//     );

//     const log = exercises.map((exercise) => ({
//       description: exercise.description,
//       duration: parseInt(exercise.duration),
//       date: new Date(exercise.date).toDateString(),
//     }));

//     const response = {
//       username: user.username,
//       count: log.length,
//       _id: userId,
//       log,
//     };

//     res.json(response);
//   } catch (error) {
//     console.error("Error getting exercise log:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

// GET USER LOGS with optional from and limit

// router.get("/api/users/:_id/logs", async (req, res) => {
//   try {
//     const db = await setupDatabase();
//     const userId = req.params._id;
//     const user = await db.get("SELECT username FROM users WHERE id = ?", [
//       userId,
//     ]);

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     let { from, to, limit } = req.query;
//     let exercisesQuery =
//       "SELECT description, duration, date FROM exercises WHERE user_id = ?";
//     let params = [userId];

//     if (from && to) {
//       exercisesQuery += " AND date BETWEEN ? AND ?";
//       params.push(from, to);
//     } else if (from) {
//       exercisesQuery += " AND date >= ?";
//       params.push(from);
//     } else if (to) {
//       exercisesQuery += " AND date <= ?";
//       params.push(to);
//     }

//     if (limit) {
//       exercisesQuery += " LIMIT ?";
//       params.push(parseInt(limit));
//     }

//     const exercises = await db.all(exercisesQuery, params);

//     const log = exercises.map((exercise) => ({
//       description: exercise.description,
//       duration: parseInt(exercise.duration),
//       date: new Date(exercise.date).toDateString(),
//     }));

//     const response = {
//       username: user.username,
//       count: log.length,
//       _id: userId,
//       log,
//     };

//     if (from) response.from = from;
//     if (to) response.to = to;
//     if (limit) response.limit = parseInt(limit);

//     res.json(response);
//   } catch (error) {
//     console.error("Error getting exercise log:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

export default router;
