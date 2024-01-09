const express = require('express');
const router = express.Router();
const cors = require('cors');

const { dbQuery } = require("../../functions/db")

const whitelist = ['http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV === 'local') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

router.use(cors(corsOptions));

router.use((req, res, next) => {
  const apiKey = req.header('x-api-key');

  let authenticationLevel = 0;

  switch (apiKey) {
    case process.env.API_KEY:
      authenticationLevel = 3;
      break;
    default:
      authenticationLevel = 0;
  }

  if (authenticationLevel > 0) {
    res.locals.authenticationLevel = authenticationLevel;
    next();
  } else {
    res.status(401).send('API Key not recognized');
  }
});

router.get('*', cors(corsOptions), (req, res, next) => {
  if (res.locals.authenticationLevel > 0) {
    next();
  } else {
    res.status(403).send('Insufficient privileges');
  }
});

router.post('*', cors(corsOptions), (req, res, next) => {
  if (res.locals.authenticationLevel > 1) {
    next();
  } else {
    res.status(403).send('Insufficient privileges');
  }
});

router.put('*', cors(corsOptions), (req, res, next) => {
  if (res.locals.authenticationLevel > 1) {
    next();
  } else {
    res.status(403).send('Insufficient privileges');
  }
});

router.delete('*', cors(corsOptions), (req, res, next) => {
  if (res.locals.authenticationLevel > 2) {
    next();
  } else {
    res.status(403).send('Insufficient privileges');
  }
});



router.get('/tags', async (req, res) => {
    try {
      const query = 'SELECT id, tag_name AS "tagName" FROM tags ORDER BY tag_name ASC';
      const tags = await dbQuery(query);
      res.json(tags);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to add a new tag
router.post('/tags', async (req, res) => {
    const { tagName } = req.body;

    try {
        const query = 'INSERT INTO tags (tag_name) VALUES ($1) RETURNING *;';
        const values = [tagName];

        const newTag = await dbQuery(query, values);
        res.status(201).json(newTag[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to delete a tag by ID
router.delete('/tags/:tagId', async (req, res) => {
    const tagId = req.params.tagId;

    try {
        const query = 'DELETE FROM tags WHERE id = $1 RETURNING *;';
        const values = [tagId];

        const deletedTag = await dbQuery(query, values);

        if (deletedTag.length === 0) {
        res.status(404).json({ error: 'Tag not found' });
        return;
        }

        res.json({ message: 'Tag deleted successfully', deletedTag: deletedTag[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



// Route to associate a tag with an event (if not already associated)
router.post('/event-tags', async (req, res) => {
  const { eventId, tagId } = req.body;

  try {
    // Check if the association already exists
    const checkQuery = 'SELECT * FROM events_tags WHERE event_id = $1 AND tag_id = $2;';
    const checkValues = [eventId, tagId];

    const existingAssociation = await dbQuery(checkQuery, checkValues);

    if (existingAssociation.length > 0) {
      // Association already exists
      res.status(400).json({ error: 'Association already exists' });
      return;
    }

    // If not, insert the new association
    const insertQuery = 'INSERT INTO events_tags (event_id, tag_id) VALUES ($1, $2) RETURNING *;';
    const insertValues = [eventId, tagId];

    const newAssociation = await dbQuery(insertQuery, insertValues);
    res.status(201).json(newAssociation[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
  
// Route to unassociate a tag from an event
router.delete('/event-tags/:eventId/:tagId', async (req, res) => {
  const eventId = req.params.eventId;
  const tagId = req.params.tagId;

  try {
    const query = 'DELETE FROM events_tags WHERE event_id = $1 AND tag_id = $2 RETURNING *;';
    const values = [eventId, tagId];

    const unassociation = await dbQuery(query, values);

    if (unassociation.length === 0) {
      res.status(404).json({ error: 'Association not found' });
      return;
    }

    res.json({ message: 'Association deleted successfully', unassociation: unassociation[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});









//Route to get all events
router.get('/', async (req, res) => {
    try {
      const query = 'SELECT id, title, description, start_datetime as "startDateTime", end_datetime as "endDateTime", published, online, location, image_url as "imageUrl" FROM events ORDER BY start_datetime ASC';
      const events = await dbQuery(query);
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/published', async (req, res) => {
  try {
    const query = 'SELECT id, title, description, start_datetime as "startDateTime", end_datetime as "endDateTime", published, online, location, image_url as "imageUrl" FROM events WHERE published AND end_datetime > NOW() ORDER BY start_datetime ASC';
    const events = await dbQuery(query);
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to get one event by ID
router.get('/:eventId', async (req, res) => {
    const eventId = req.params.eventId;
  
    try {
      const query = 'SELECT id, title, description, start_datetime as "startDateTime", end_datetime as "endDateTime", published, online, location, image_url as "imageUrl" FROM events WHERE id = $1';
      const event = await dbQuery(query, [eventId]);
  
      if (event.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
  
      res.json(event[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:eventId/tags', async (req, res) => {
  const eventId = req.params.eventId;

  try {
    const query = `
      SELECT tags.id, tags.tag_name AS "tagName"
      FROM tags
      JOIN events_tags ON tags.id = events_tags.tag_id
      WHERE events_tags.event_id = $1
      ORDER BY tags.tag_name ASC
    `;
    const tags = await dbQuery(query, [eventId]);
    console.log(tags)
    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// Route to get all events associated with a specific tag
router.get('/by-tag/:tagId', async (req, res) => {
    const tagId = req.params.tagId;
  
    try {
      const query = `
        SELECT events.id, events.title, events.description, events.start_datetime as "startDateTime", events.end_datetime as "endDateTime", events.published, events.online, events.location, events.image_url as "imageUrl"
        FROM events
        JOIN events_tags ON events.id = events_tags.event_id
        JOIN tags ON events_tags.tag_id = tags.id
        WHERE tags.id = $1
      `;
      const events = await dbQuery(query, [tagId]);
  
      if (events.length === 0) {
        res.status(404).json([]);
        return;
      }
  
      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/', async (req, res) => {
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      published,
      online,
      location,
      imageUrl,
    } = req.body;
  
    // If startDateTime or endDateTime is not provided, set them to the current date and time
    const now = new Date();
    const formattedStartDateTime = startDateTime || now;
    const formattedEndDateTime = endDateTime || now;
  
    try {
      const query = `
        INSERT INTO events (title, description, start_datetime, end_datetime, published, online, location, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
  
      const values = [
        title,
        description,
        formattedStartDateTime,
        formattedEndDateTime,
        published,
        online,
        location,
        imageUrl,
      ];
  
      const newEvent = await dbQuery(query, values);
      res.status(201).json(newEvent[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/:eventId', async (req, res) => {
    const eventId = req.params.eventId;
    console.log(req.body)
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      published,
      online,
      location,
      imageUrl,
    } = req.body;

  
    try {
      const query = `
        UPDATE events
        SET title = $1, description = $2, start_datetime = $3, end_datetime = $4, published = $5, online = $6, location = $7, image_url = $8
        WHERE id = $9
        RETURNING *;
      `;
  
      const values = [
        title,
        description,
        startDateTime,
        endDateTime,
        published,
        online,
        location,
        imageUrl,
        eventId,
      ];
  
      const updatedEvent = await dbQuery(query, values);
  
      if (updatedEvent.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
  
      res.json(updatedEvent[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.delete('/:eventId', async (req, res) => {
    const eventId = req.params.eventId;
  
    try {
      const query = 'DELETE FROM events WHERE id = $1 RETURNING *;';
      const values = [eventId];
  
      const deletedEvent = await dbQuery(query, values);
  
      if (deletedEvent.length === 0) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
  
      res.json({ message: 'Event deleted successfully', deletedEvent: deletedEvent[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});









module.exports = router;