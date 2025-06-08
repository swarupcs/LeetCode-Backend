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
        comments: {
          where: { parentId: null },
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
        _count: {
          select: {
            comments: true,
            votes: true,
            bookmarks: true,
          },
        },
      },
    });

    res.status(200).json({
      message:
        discussions.length > 0
          ? 'Discussions fetched successfully'
          : 'No discussions found',
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
          where: { parentId: null },
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
            votes: true, // Optional — if you want to show vote counts/userVote
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
    console.error('Error fetching single discussion:', err);
    res.status(500).json({ message: 'Error fetching discussion' });
  }
};


export const updateDiscussion = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, content, codeContent, codeLanguage, category, tags } =
    req.body;

  try {
    const discussion = await db.discussion.findUnique({
      where: { id },
      select: {
        authorId: true,
      },
    });

    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

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
            image: true,
            email: true,
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
      select: {
        authorId: true,
      },
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


export const createComment = async (req, res) => {
  const userId = req.user.id;
  const { discussionId, content, parentId } = req.body;

  if (!discussionId || !content) {
    return res
      .status(400)
      .json({ message: 'discussionId and content are required' });
  }

  try {
    // Optionally check if discussion exists (optional but recommended)
    const discussion = await db.discussion.findUnique({
      where: { id: discussionId },
    });
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // If parentId is provided, check if parent comment exists and belongs to same discussion
    if (parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      if (parentComment.discussionId !== discussionId) {
        return res
          .status(400)
          .json({
            message: 'Parent comment must belong to the same discussion',
          });
      }
    }

    const newComment = await db.comment.create({
      data: {
        content,
        discussionId,
        parentId: parentId || null,
        authorId: userId,
      },
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
    });

    res.status(201).json({
      message: 'Comment created successfully',
      data: newComment,
    });
  } catch (err) {
    console.error('Error creating comment:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get all comments for a discussion, with nested replies
export const getAllComments = async (req, res) => {
  const { discussionId } = req.params;

  try {
    // Check if discussion exists
    const discussion = await db.discussion.findUnique({
      where: { id: discussionId },
    });
    if (!discussion) {
      return res.status(404).json({ message: "Discussion not found" });
    }

    // Fetch comments with nested replies (recursive depth depends on DB; here we fetch one level)
    const comments = await db.comment.findMany({
      where: { discussionId, parentId: null }, // fetch only root comments
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
            votes: true,
          },
        },
        votes: true,
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({
      message: "Comments fetched successfully",
      data: comments,
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const updateComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    const existingComment = await db.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.authorId !== userId) {
      return res
        .status(403)
        .json({ message: 'Forbidden - Not the comment author' });
    }

    const updated = await db.comment.update({
      where: { id },
      data: {
        content,
        isEdited: true,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      message: 'Comment updated successfully',
      data: updated,
    });
  } catch (err) {
    console.error('Error updating comment:', err);
    res.status(500).json({ message: 'Error updating comment' });
  }
};


export const deleteComment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existingComment = await db.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (existingComment.authorId !== userId) {
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

