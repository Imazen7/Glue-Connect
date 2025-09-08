Glue Connect

Glue Connect is a web platform designed to bring students, professors, and placement coordinators together in one collaborative space.  
It allows users to create profiles, form clubs, connect with peers, and communicate seamlessly.

Features:
- User Authentication:
  - Email/password login with rate limiting (lockout after multiple failed attempts).  
  - Google Sign-In support.  

- Profile Management: 
  - Users can create and update their profiles with details such as name, role, USN, description, about, skills, resume, and social links.  
  - Uniqueness checks for USN and phone numbers.  

- Clubs:  
  - Create clubs (only available if a user has filled their profile).  
  - Club creator can:
    - Add users (by name or USN).  
    - Remove users.  
    - Approve or reject join requests.  
    - Send messages (visible only to members).  
  - Members can:
    - View messages.  
    - Leave the club anytime.  
  - Public visibility of clubs (name + description).  
  - Join requests for new users.  
  - Search bar for finding clubs by name.  

- Chat:  
  - One-to-one chat between users.  
  - Persistent conversations after logout/login.

- Placement:  
  - Allows Placement coordinators and professors to identify qualified candidates for placements and internships quickly.
    
- Project Partner:  
  - Search for project partners by skills. View profiles to collaborate on academic and research projects..  

Tech Stack:
- Frontend: React, Tailwind CSS
- Backend: Node.js, Websocket
- Authentication & Database: Firebase Authentication, Firestore  
