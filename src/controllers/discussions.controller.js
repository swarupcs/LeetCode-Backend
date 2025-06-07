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
        comments: {
          where: { parentId: null }, // fetch top-level comments only
          include: {
            author: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                  },
                },
                replies: {
                  include: {
                    author: {
                      select: {
                        id: true,
                        username: true,
                        image: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Ensure comments array is always present
    const discussionWithComments = {
      ...newDiscussion,
      comments: newDiscussion.comments || [],
    };

    res.status(201).json(discussionWithComments);
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

export const getSingleDiscussion = async (req, res) => {
  const { id } = req.params;

  try {
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            image: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
            replies: true,
            votes: true,
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

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    res.status(200).json(discussion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching discussion' });
  }
};


export const updateDiscussion = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, content, codeContent, codeLanguage, category, tags } =
    req.body;

  try {
    // Find discussion
    const discussion = await db.discussion.findUnique({
      where: { id },
    });

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Check if the user is the author
    if (discussion.authorId !== userId) {
      return res
        .status(403)
        .json({ message: 'Unauthorized to update this discussion' });
    }

    const updatedDiscussion = await db.discussion.update({
      where: { id },
      data: {
        title,
        content,
        contentType: codeContent ? 'code' : 'text',
        codeContent: codeContent || null,
        codeLanguage: codeLanguage || null,
        category,
        tags,
        isEdited: true,
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

    res.status(200).json({
      message: 'Discussion updated successfully',
      data: updatedDiscussion,
    });
  } catch (err) {
    console.error('Error updating discussion:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteDiscussion = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  console.log("id", id);
  console.log("userId", userId);

  try {
    const discussion = await db.discussion.findUnique({
      where: { id },
    });

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Check if the user is the author
    if (discussion.authorId !== userId) {
      return res
        .status(403)
        .json({ message: 'Unauthorized to delete this discussion' });
    }

    await db.discussion.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Discussion deleted successfully' });
  } catch (err) {
    console.error('Error deleting discussion:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};







export const updateComment = async (req, res) => {
  const { id } = req.params; // comment ID
  const { content } = req.body;

  try {
    const existingComment = await db.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.authorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'Forbidden - Not the comment author' });
    }

    const updated = await db.comment.update({
      where: { id },
      data: {
        content,
        updatedAt: new Date(),
      },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ message: 'Error updating comment' });
  }
};

export const deleteComment = async (req, res) => {
  const { id } = req.params; // comment ID

  try {
    const existingComment = await db.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.authorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'Forbidden - Not the comment author' });
    }

    await db.comment.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ message: 'Error deleting comment' });
  }
};
