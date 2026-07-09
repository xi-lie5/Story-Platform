const { pool } = require('../config/database');

class StoryReadEvent {
  static async create({ storyId, userId, sessionId = null, fromNodeId = null, toNodeId, choiceText = null }) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO story_read_events (story_id, user_id, session_id, from_node_id, to_node_id, choice_text)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [storyId, userId, sessionId, fromNodeId || null, toNodeId, choiceText || null]
      );
    } finally {
      connection.release();
    }
  }

  static async getAnalytics(storyId) {
    const connection = await pool.getConnection();
    try {
      const [totals] = await connection.execute(
        `SELECT COUNT(*) AS total_reads, COUNT(DISTINCT user_id) AS unique_readers
         FROM story_read_events
         WHERE story_id = ?`,
        [storyId]
      );

      const [endReaders] = await connection.execute(
        `SELECT COUNT(DISTINCT e.user_id) AS completed_readers
         FROM story_read_events e
         INNER JOIN story_nodes n ON n.id = e.to_node_id
         WHERE e.story_id = ? AND n.type = 'end'`,
        [storyId]
      );

      const [choiceRows] = await connection.execute(
        `SELECT e.to_node_id AS node_id, COALESCE(n.title, e.to_node_id) AS node_title,
                COALESCE(e.choice_text, 'Continue') AS choice_text, COUNT(*) AS count
         FROM story_read_events e
         LEFT JOIN story_nodes n ON n.id = e.to_node_id
         WHERE e.story_id = ?
         GROUP BY e.to_node_id, n.title, e.choice_text
         ORDER BY count DESC
         LIMIT 50`,
        [storyId]
      );

      const [flowRows] = await connection.execute(
        `SELECT e.from_node_id AS source, e.to_node_id AS target,
                COALESCE(from_node.title, 'Start') AS from_title,
                COALESCE(to_node.title, e.to_node_id) AS to_title,
                COALESCE(e.choice_text, 'Continue') AS choice_text,
                COUNT(*) AS count
         FROM story_read_events e
         LEFT JOIN story_nodes from_node ON from_node.id = e.from_node_id
         LEFT JOIN story_nodes to_node ON to_node.id = e.to_node_id
         WHERE e.story_id = ?
         GROUP BY e.from_node_id, e.to_node_id, from_node.title, to_node.title, e.choice_text
         ORDER BY count DESC
         LIMIT 100`,
        [storyId]
      );

      const totalReads = totals[0]?.total_reads || 0;
      const uniqueReaders = totals[0]?.unique_readers || 0;
      const completedReaders = endReaders[0]?.completed_readers || 0;

      return {
        total_reads: totalReads,
        unique_readers: uniqueReaders,
        completion_rate: uniqueReaders > 0 ? completedReaders / uniqueReaders : 0,
        completed_readers: completedReaders,
        choice_distribution: choiceRows.map((row) => ({
          node_id: row.node_id,
          node_title: row.node_title,
          choice_text: row.choice_text,
          count: row.count
        })),
        path_flow: flowRows.map((row) => ({
          from: row.source,
          to: row.target,
          from_title: row.from_title,
          to_title: row.to_title,
          choice_text: row.choice_text,
          count: row.count
        }))
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = StoryReadEvent;
