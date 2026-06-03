import { CREATE_EVENT_TOOL } from './create-event.tool';
import { CREATE_MEETING_TOOL } from './create-meeting.tool';
import { LIST_MY_EVENTS_TOOL } from './list-my-events.tool';
import { RESOLVE_FACULTY_TOOL } from './resolve-faculty.tool';
import { SEARCH_FRIENDS_TOOL } from './search-friends.tool';

// -------------------------------------------------------------------
// Agent tool declarations for Gemini function calling (step 2).
// Wired into GeminiService in step 4; executed in step 3.
// -------------------------------------------------------------------

/** Function declarations passed to Gemini when tools are enabled. */
export const AGENT_TOOL_DECLARATIONS = [
  RESOLVE_FACULTY_TOOL,
  CREATE_EVENT_TOOL,
  CREATE_MEETING_TOOL,
  SEARCH_FRIENDS_TOOL,
  LIST_MY_EVENTS_TOOL,
] as const;

export {
  CREATE_EVENT_TOOL,
  CREATE_EVENT_TOOL_NAME,
} from './create-event.tool';
export type {
  CreateEventToolArgs,
  EventVisibilityToolValue,
} from './create-event.tool.types';
export {
  CREATE_MEETING_TOOL,
  CREATE_MEETING_TOOL_NAME,
} from './create-meeting.tool';
export type { CreateMeetingToolArgs } from './create-meeting.tool.types';
export {
  RESOLVE_FACULTY_TOOL,
  RESOLVE_FACULTY_TOOL_NAME,
} from './resolve-faculty.tool';
export type { ResolveFacultyToolArgs } from './resolve-faculty.tool';
export {
  SEARCH_FRIENDS_TOOL,
  SEARCH_FRIENDS_TOOL_NAME,
} from './search-friends.tool';
export type { SearchFriendsToolArgs } from './search-friends.tool.types';
export {
  LIST_MY_EVENTS_TOOL,
  LIST_MY_EVENTS_TOOL_NAME,
} from './list-my-events.tool';
export type {
  ListMyEventsScope,
  ListMyEventsTimeframe,
  ListMyEventsToolArgs,
} from './list-my-events.tool.types';
