#!/usr/bin/env python3
"""
Web page crawler that converts content to Markdown format.
Usage: python crawl.py https://example.com/page
"""

import sys
import asyncio
from crawl4ai import AsyncWebCrawler
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator


async def crawl_url(url: str) -> None:
    """
    Crawl a URL and print its content in Markdown format.
    
    Args:
        url: The URL to crawl
    """
    try:
        # Create markdown generator that preserves links
        markdown_generator = DefaultMarkdownGenerator()
        
        async with AsyncWebCrawler(verbose=True) as crawler:
            # Crawl the URL
            result = await crawler.arun(
                url=url,
                markdown_generator=markdown_generator,
                bypass_cache=True
            )
            
            # Check if crawl was successful
            if result.success:
                print("\n" + "="*80)
                print(f"Successfully crawled: {url}")
                print("="*80 + "\n")
                
                # Print the markdown content
                print(result.markdown)
                
                print("\n" + "="*80)
                print(f"Content length: {len(result.markdown)} characters")
                print("="*80)
            else:
                print(f"Error: Failed to crawl {url}", file=sys.stderr)
                print(f"Error message: {result.error_message}", file=sys.stderr)
                sys.exit(1)
                
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point for the script."""
    # Check command line arguments
    if len(sys.argv) != 2:
        print("Usage: python crawl.py <url>", file=sys.stderr)
        print("Example: python crawl.py https://example.com", file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    
    # Validate URL format
    if not url.startswith(('http://', 'https://')):
        print("Error: URL must start with http:// or https://", file=sys.stderr)
        sys.exit(1)
    
    # Run the async crawler
    asyncio.run(crawl_url(url))


if __name__ == "__main__":
    main()
