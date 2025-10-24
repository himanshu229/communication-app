const fs = require('fs');
const path = require('path');

class DataInitializer {
  constructor(dataDir) {
    this.dataDir = dataDir;
  }

  // Default data structures
  getDefaultUsers() {
    return {};
  }

  getDefaultChatRooms() {
    return {};
  }

  getDefaultMessages() {
    return {};
  }

  getDefaultCallHistory() {
    return {};
  }

  // Initialize data directory and files
  initializeDataFiles() {
    console.log('Initializing data files...');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`Created data directory: ${this.dataDir}`);
    }

    // Define file configurations
    const files = [
      {
        path: path.join(this.dataDir, 'users.json'),
        data: this.getDefaultUsers(),
        description: 'Users'
      },
      {
        path: path.join(this.dataDir, 'chatRooms.json'),
        data: this.getDefaultChatRooms(),
        description: 'Chat Rooms'
      },
      {
        path: path.join(this.dataDir, 'messages.json'),
        data: this.getDefaultMessages(),
        description: 'Messages'
      },
      {
        path: path.join(this.dataDir, 'callHistory.json'),
        data: this.getDefaultCallHistory(),
        description: 'Call History'
      }
    ];

    // Create files if they don't exist
    files.forEach(file => {
      if (!fs.existsSync(file.path)) {
        try {
          fs.writeFileSync(file.path, JSON.stringify(file.data, null, 2));
          console.log(`✅ Created ${file.description} file: ${file.path}`);
        } catch (error) {
          console.error(`❌ Error creating ${file.description} file:`, error.message);
          throw error;
        }
      } else {
        console.log(`⚡ ${file.description} file already exists: ${file.path}`);
      }
    });

    console.log('Data files initialization completed!');
  }

  // Validate data files integrity
  validateDataFiles() {
    const files = [
      path.join(this.dataDir, 'users.json'),
      path.join(this.dataDir, 'chatRooms.json'),
      path.join(this.dataDir, 'messages.json'),
      path.join(this.dataDir, 'callHistory.json')
    ];

    for (const filePath of files) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required data file missing: ${filePath}`);
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content); // Validate JSON format
      } catch (error) {
        throw new Error(`Invalid JSON in data file ${filePath}: ${error.message}`);
      }
    }

    console.log('✅ All data files are valid');
    return true;
  }

  // Check if data files exist
  dataFilesExist() {
    const files = [
      path.join(this.dataDir, 'users.json'),
      path.join(this.dataDir, 'chatRooms.json'),
      path.join(this.dataDir, 'messages.json'),
      path.join(this.dataDir, 'callHistory.json')
    ];

    return files.every(filePath => fs.existsSync(filePath));
  }
}

module.exports = DataInitializer;