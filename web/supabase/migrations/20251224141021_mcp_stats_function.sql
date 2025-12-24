-- MCP usage statistics function
-- Provides analytics specifically for MCP tool usage

CREATE OR REPLACE FUNCTION get_mcp_stats(requesting_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    -- Total MCP calls
    'total_mcp_calls', (
      SELECT COUNT(*) FROM tool_uses tu
      JOIN sessions s ON s.id = tu.session_id
      WHERE s.user_id = requesting_user_id
        AND tu.tool_name LIKE 'mcp__%'
    ),
    -- MCP calls by server (parsed from tool_name)
    'servers', COALESCE((
      SELECT json_agg(server_data ORDER BY server_data.count DESC)
      FROM (
        SELECT
          SPLIT_PART(SPLIT_PART(tu.tool_name, '__', 2), '__', 1) as server_name,
          COUNT(*) as count
        FROM tool_uses tu
        JOIN sessions s ON s.id = tu.session_id
        WHERE s.user_id = requesting_user_id
          AND tu.tool_name LIKE 'mcp__%'
        GROUP BY SPLIT_PART(SPLIT_PART(tu.tool_name, '__', 2), '__', 1)
      ) server_data
    ), '[]'::json),
    -- Top MCP tools
    'top_tools', COALESCE((
      SELECT json_agg(tool_data ORDER BY tool_data.count DESC)
      FROM (
        SELECT
          tu.tool_name,
          -- Extract readable name: mcp__server__tool -> tool
          SPLIT_PART(tu.tool_name, '__', 3) as short_name,
          SPLIT_PART(SPLIT_PART(tu.tool_name, '__', 2), '__', 1) as server,
          COUNT(*) as count,
          SUM(CASE WHEN tu.success THEN 1 ELSE 0 END) as success_count
        FROM tool_uses tu
        JOIN sessions s ON s.id = tu.session_id
        WHERE s.user_id = requesting_user_id
          AND tu.tool_name LIKE 'mcp__%'
        GROUP BY tu.tool_name
        ORDER BY COUNT(*) DESC
        LIMIT 20
      ) tool_data
    ), '[]'::json),
    -- MCP usage over time (last 30 days)
    'daily_usage', COALESCE((
      SELECT json_agg(daily_data ORDER BY daily_data.date)
      FROM (
        SELECT
          DATE(tu.timestamp) as date,
          COUNT(*) as count
        FROM tool_uses tu
        JOIN sessions s ON s.id = tu.session_id
        WHERE s.user_id = requesting_user_id
          AND tu.tool_name LIKE 'mcp__%'
          AND tu.timestamp > NOW() - INTERVAL '30 days'
        GROUP BY DATE(tu.timestamp)
      ) daily_data
    ), '[]'::json),
    -- MCP vs native tool comparison
    'mcp_vs_native', (
      SELECT json_build_object(
        'mcp', COUNT(*) FILTER (WHERE tu.tool_name LIKE 'mcp__%'),
        'native', COUNT(*) FILTER (WHERE tu.tool_name NOT LIKE 'mcp__%')
      )
      FROM tool_uses tu
      JOIN sessions s ON s.id = tu.session_id
      WHERE s.user_id = requesting_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_mcp_stats TO authenticated;
