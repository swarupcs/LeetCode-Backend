import { db } from '../libs/db.js';

// Create a new discussion
export const createDiscussion = async (req, res) => {
  const userId = req.user.id;
  try {
    const {
      title,
      content,
      codeContent,
      codeLanguage,
      category,
      problemId,
      problemTitle,
      problemDifficulty,
      company,
      position,
      tags,
    } = req.body;

    // Validation
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newDiscussion = await db.discussion.create({
      data: {
        title,
        content,
        contentType: codeContent ? 'code' : 'text',
        codeContent: codeContent || null,
        codeLanguage: codeLanguage || null,
        category,
        problemId: problemId || null,
        problemTitle: problemTitle || null,
        problemDifficulty: problemDifficulty || null,
        company: company || null,
        position: position || null,
        tags,
        author: {
          connect: { id: userId },
        },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            image: true,
          },
        },
      },
    });

    res.status(201).json(newDiscussion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating discussion' });
  }
};

export const getAllDiscussions = async (req, res) => {
  try {
    const discussions = await db.discussion.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            image: true,
          },
        },
        _count: {
          select: {
            comments: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });

    if (discussions.length === 0) {
      return res.status(200).json({
        message: 'No discussions found',
        data: [],
      });
    }

    res.status(200).json({
      message: 'Discussions fetched successfully',
      data: discussions,
    });
  } catch (err) {
    console.error('Error fetching discussions:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
