import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';

export interface NotionProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  type: string;
  techStack: string[];
  gallery: string[];
  galleryCaptions?: string[];
  content?: string;
  url?: string;
  timeline?: string;
}

// Helper to safely get env variables in Astro across Node and Cloudflare
async function getRuntimeEnv(key: string) {
  // 1. Try Cloudflare Workers native environment variables (Astro 7+ standard)
  try {
    const moduleName = 'cloudflare:workers';
    // @ts-ignore
    const cf = await import(/* @vite-ignore */ moduleName);
    if (cf && cf.env && cf.env[key]) return cf.env[key];
  } catch (e) {
    // We are running in local Node.js development, just ignore
  }
  
  // 2. Try import.meta.env (Astro build-time fallback)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // 3. Fallback to process.env (Node.js runtime / Vercel)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  return undefined;
}

// Function to fetch all published projects
export async function getProjectsFromNotion(): Promise<NotionProject[]> {
  const databaseId = await getRuntimeEnv('NOTION_DATABASE_ID');
  const token = await getRuntimeEnv('NOTION_ACCESS_TOKEN');
  
  try {
    if (!databaseId) {
      throw new Error("NOTION_DATABASE_ID is missing!");
    }
    if (!token) {
      throw new Error("NOTION_ACCESS_TOKEN is missing!");
    }
    
    const requestBody = {
      filter: {
        property: 'Published',
        checkbox: {
          equals: true
        }
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    };

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const results = data.results;

    return results.map((page: any) => {
      const props = page.properties;
      
      // Notion properties are heavily nested and their keys depend on exactly what the user named them.
      // We will do our best to map common names.
      
      // Find the title property (it's the only one of type 'title')
      const titleKey = Object.keys(props).find(key => props[key].type === 'title') || 'Name';
      const title = props[titleKey]?.title[0]?.plain_text || 'Untitled Project';
      
      // Slugified title for URL
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      // Description (rich_text)
      const descProp = props.Description || props.description || props.Summary || props.summary;
      const description = descProp?.rich_text?.map((rt: any) => rt.plain_text).join('') || '';

      // Type (select or multi_select)
      const typeProp = props.Type || props.type;
      let type = 'Digital Fragment';
      if (typeProp?.type === 'multi_select' && typeProp.multi_select?.length > 0) {
        type = typeProp.multi_select.map((t: any) => t.name).join(' • ');
      } else if (typeProp?.type === 'select' && typeProp.select) {
        type = typeProp.select.name;
      }

      // Tech Stack (multi_select)
      const techProp = props.TechStack || props.techStack || props.tech_stack || Object.values(props).find((p:any) => p.type === 'multi_select' && p.id !== typeProp?.id);
      const techStack = techProp?.multi_select?.map((item: any) => item.name) || ['Uncategorized'];

      // Image and Gallery (Support for Files & media type with multiple images)
      let image = '';
      const gallery: string[] = [];
      const galleryCaptions: string[] = [];
      const imgProp = props.Image || props.image || props.Cover || props.cover || props.Gallery || props.gallery;
      
      // Captions (from a Text column named "Captions" or "captions", separated by ||)
      const captionsProp = props.Captions || props.captions;
      let explicitCaptions: string[] = [];
      if (captionsProp && captionsProp.rich_text && captionsProp.rich_text.length > 0) {
        const rawCaptions = captionsProp.rich_text.map((rt: any) => rt.plain_text).join('');
        // Pisahkan berdasarkan ||
        explicitCaptions = rawCaptions.split('||').map((c: string) => c.trim()).filter(Boolean);
        // Replace | with \n for the frontend to handle as line breaks
        explicitCaptions = explicitCaptions.map((c: string) => c.replace(/\|/g, '\n'));
      }

      if (imgProp?.type === 'url' && imgProp.url) {
        // If it's still a simple URL string
        image = imgProp.url;
        gallery.push(image);
        galleryCaptions.push(explicitCaptions[0] || 'Project Fragment');
      } else if (imgProp?.type === 'files' && imgProp.files?.length > 0) {
        // If it's a Files & media column, extract all images!
        imgProp.files.forEach((fileObj: any, index: number) => {
          const fileUrl = fileObj.file?.url || fileObj.external?.url;
          if (fileUrl) {
            gallery.push(fileUrl);
            
            // Priority: 1. Explicit Captions column, 2. File Name (if not URL), 3. Default
            let caption = 'Project Fragment';
            if (explicitCaptions[index]) {
              caption = explicitCaptions[index];
            } else if (fileObj.name && !fileObj.name.startsWith('http') && !fileObj.name.includes('untitled')) {
              caption = fileObj.name;
            }
            galleryCaptions.push(caption);
          }
        });
        
        // Main image is the first one
        if (gallery.length > 0) {
          image = gallery[0];
        }
      }

      // URL (url type or rich_text type)
      const urlKey = Object.keys(props).find(k => k.toLowerCase() === 'url' || k.toLowerCase() === 'link' || k.toLowerCase() === 'website');
      const urlProp = urlKey ? props[urlKey] : null;
      let url = '';
      if (urlProp?.type === 'url') {
        url = urlProp.url || '';
      } else if (urlProp?.type === 'rich_text') {
        url = urlProp.rich_text?.map((rt: any) => rt.plain_text).join('') || '';
      }

      // Timeline / Duration
      const timelineKey = Object.keys(props).find(k => k.toLowerCase() === 'timeline' || k.toLowerCase() === 'duration' || k.toLowerCase() === 'time');
      const timelineProp = timelineKey ? props[timelineKey] : null;
      let timeline = '';
      if (timelineProp && timelineProp.rich_text && timelineProp.rich_text.length > 0) {
        timeline = timelineProp.rich_text.map((rt: any) => rt.plain_text).join('');
      } else if (timelineProp && timelineProp.title && timelineProp.title.length > 0) {
         timeline = timelineProp.title.map((rt: any) => rt.plain_text).join('');
      }

      return {
        id: page.id,
        slug,
        title,
        description,
        image,
        type,
        techStack,
        gallery,
        galleryCaptions,
        url,
        timeline
      };
    });
  } catch (error) {
    console.error("Error fetching from Notion API:", error);
    return [];
  }
}

// Function to fetch content for a specific page ID
export async function getProjectContent(pageId: string): Promise<string> {
  try {
    const token = await getRuntimeEnv('NOTION_ACCESS_TOKEN');
    if (!token) throw new Error("NOTION_ACCESS_TOKEN is missing!");
    
    const notion = new Client({ auth: token });
    const n2m = new NotionToMarkdown({ notionClient: notion });
    
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);
    return mdString.parent || '';
  } catch (error) {
    console.error("Error fetching Notion content:", error);
    return '';
  }
}
