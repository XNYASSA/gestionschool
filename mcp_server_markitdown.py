#!/usr/bin/env python3
"""MCP Server for MarkItDown - converts documents to Markdown"""

import sys
import asyncio
from pathlib import Path
from markitdown import MarkItDown
from mcp.server import Server
from mcp.types import Tool, TextContent, ToolResult

# Initialize MarkItDown
md = MarkItDown()

# Create MCP Server with stdio transport
server = Server("markitdown")

@server.list_tools()
async def list_tools():
    """List available tools"""
    return [
        Tool(
            name="convert_to_markdown",
            description="Convert a document file (PDF, Word, Excel, PowerPoint, CSV, Images, etc.) to Markdown format using MarkItDown",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the file to convert (PDF, DOCX, XLSX, PPTX, CSV, JPG, PNG, etc.)"
                    }
                },
                "required": ["file_path"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> ToolResult:
    """Handle tool calls"""
    if name == "convert_to_markdown":
        file_path = arguments.get("file_path")
        if not file_path:
            return ToolResult(content=[TextContent(type="text", text="Error: file_path is required")])

        try:
            path = Path(file_path)
            if not path.exists():
                return ToolResult(content=[TextContent(type="text", text=f"Error: File not found: {file_path}")])

            # Convert file to Markdown using MarkItDown
            result = md.convert(str(path))
            return ToolResult(content=[TextContent(type="text", text=result)])
        except Exception as e:
            return ToolResult(content=[TextContent(type="text", text=f"Error converting file: {str(e)}")])

    return ToolResult(content=[TextContent(type="text", text=f"Unknown tool: {name}")])

async def main():
    """Main entry point with stdio transport"""
    async with server.stdio():
        await server.wait_for_shutdown()

if __name__ == "__main__":
    asyncio.run(main())
