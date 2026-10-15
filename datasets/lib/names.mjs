/** Vocabulary for synthetic datasets. Fictional combinations only; no real person or company is modeled. */
export const FIRST_NAMES = [
  'Aaliyah', 'Aaron', 'Abigail', 'Adrian', 'Aisha', 'Alejandro', 'Alex', 'Alexis', 'Ali', 'Alice', 'Amara', 'Amir', 'Ana', 'Andre', 'Andrew', 'Angela', 'Anika', 'Anna',
  'Arjun', 'Ava', 'Ayesha', 'Ben', 'Bianca', 'Brandon', 'Brian', 'Caleb', 'Camila', 'Carlos', 'Carmen', 'Chen', 'Chloe', 'Chris', 'Daniel', 'Daniela', 'David', 'Deepa',
  'Diego', 'Dmitri', 'Elena', 'Eli', 'Elijah', 'Emily', 'Emma', 'Eric', 'Esther', 'Ethan', 'Fatima', 'Felix', 'Gabriel', 'Grace', 'Hana', 'Hannah', 'Hassan', 'Hector',
  'Hiro', 'Ibrahim', 'Imani', 'Isaac', 'Isabel', 'Ivan', 'Jack', 'Jacob', 'Jada', 'James', 'Jamal', 'Jasmine', 'Javier', 'Jaya', 'Jessica', 'Jin', 'John', 'Jordan',
  'Jose', 'Joseph', 'Julia', 'Kai', 'Karen', 'Kavya', 'Kenji', 'Kevin', 'Kim', 'Laila', 'Laura', 'Leah', 'Leo', 'Liam', 'Lily', 'Lin', 'Lucas', 'Lucia', 'Luis', 'Maya',
  'Malik', 'Marco', 'Maria', 'Mark', 'Mateo', 'Mei', 'Mia', 'Michael', 'Miguel', 'Mohammed', 'Nadia', 'Naomi', 'Nathan', 'Nia', 'Nina', 'Noah', 'Nora', 'Olivia', 'Omar',
  'Oscar', 'Pablo', 'Patrick', 'Paul', 'Priya', 'Rachel', 'Rahul', 'Raj', 'Rana', 'Ravi', 'Rebecca', 'Ricardo', 'Riya', 'Robert', 'Rosa', 'Ryan', 'Sam', 'Samuel',
  'Sara', 'Sasha', 'Sean', 'Sofia', 'Sophie', 'Sun', 'Tara', 'Thomas', 'Tomas', 'Tyler', 'Valentina', 'Victor', 'Wei', 'William', 'Yara', 'Yusuf', 'Zara', 'Zoe',
];
export const LAST_NAMES = [
  'Abbott', 'Adams', 'Ahmed', 'Ali', 'Alvarez', 'Anderson', 'Baker', 'Banerjee', 'Barnes', 'Bell', 'Bennett', 'Brooks', 'Brown', 'Campbell', 'Carter', 'Castillo', 'Chang',
  'Chen', 'Clark', 'Collins', 'Cooper', 'Cruz', 'Davis', 'Diaz', 'Edwards', 'Evans', 'Fernandez', 'Fischer', 'Flores', 'Foster', 'Garcia', 'Gomez', 'Gonzalez', 'Gray',
  'Green', 'Gupta', 'Hall', 'Harris', 'Hayes', 'Hernandez', 'Hill', 'Hoang', 'Howard', 'Hughes', 'Ibrahim', 'Ito', 'Jackson', 'James', 'Jenkins', 'Johnson', 'Jones',
  'Kang', 'Kaur', 'Kelly', 'Khan', 'Kim', 'King', 'Kowalski', 'Kumar', 'Lee', 'Lewis', 'Li', 'Liu', 'Lopez', 'Martin', 'Martinez', 'Mehta', 'Miller', 'Mitchell',
  'Moore', 'Morales', 'Morgan', 'Murphy', 'Nakamura', 'Nelson', 'Nguyen', 'Novak', 'Okafor', 'Olsen', 'Ortiz', 'Park', 'Patel', 'Perez', 'Peterson', 'Phillips',
  'Price', 'Ramirez', 'Reddy', 'Reed', 'Reyes', 'Richardson', 'Rivera', 'Roberts', 'Robinson', 'Rodriguez', 'Ross', 'Russell', 'Sanchez', 'Sato', 'Schmidt', 'Scott',
  'Shah', 'Silva', 'Singh', 'Smith', 'Stewart', 'Sullivan', 'Tanaka', 'Taylor', 'Thomas', 'Thompson', 'Torres', 'Tran', 'Turner', 'Walker', 'Wang', 'Ward', 'Watson',
  'White', 'Williams', 'Wilson', 'Wong', 'Wright', 'Wu', 'Yamamoto', 'Yang', 'Young', 'Zhang',
];
export const COMPANY_A = ['Acme', 'Apex', 'Arbor', 'Atlas', 'Beacon', 'Birch', 'Blue', 'Bright', 'Cedar', 'Clear', 'Cobalt', 'Copper', 'Crest', 'Delta', 'Ember', 'Evergreen',
  'Falcon', 'Fern', 'Granite', 'Harbor', 'Helix', 'Horizon', 'Iron', 'Juniper', 'Keystone', 'Lantern', 'Linden', 'Lumen', 'Maple', 'Meridian', 'Nimbus', 'North', 'Oak',
  'Onyx', 'Orbit', 'Pine', 'Pioneer', 'Prism', 'Quartz', 'Red', 'Ridge', 'River', 'Sable', 'Sage', 'Silver', 'Sky', 'Slate', 'Solar', 'Spruce', 'Summit', 'Swift',
  'Tidal', 'Timber', 'True', 'Union', 'Vector', 'Verde', 'Vista', 'West', 'Willow', 'Zenith'];
export const COMPANY_B = ['Analytics', 'Bio', 'Labs', 'Logistics', 'Media', 'Systems', 'Works', 'Health', 'Foods', 'Robotics', 'Partners', 'Studio', 'Capital', 'Energy',
  'Supply', 'Software', 'Security', 'Retail', 'Design', 'Data', 'Networks', 'Learning', 'Travel', 'Motors', 'Outfitters'];
export const COMPANY_SUFFIX = ['Inc', 'LLC', 'Co', 'Group', 'Ltd', ''];

/** U.S. cities used for synthetic addresses: [city, state, weight]. */
export const US_CITIES = [
  ['New York', 'NY', 30], ['Los Angeles', 'CA', 22], ['Chicago', 'IL', 16], ['Houston', 'TX', 14], ['Phoenix', 'AZ', 10], ['Philadelphia', 'PA', 9], ['San Antonio', 'TX', 8],
  ['San Diego', 'CA', 8], ['Dallas', 'TX', 8], ['Austin', 'TX', 7], ['Jacksonville', 'FL', 6], ['San Jose', 'CA', 6], ['Columbus', 'OH', 6], ['Charlotte', 'NC', 6],
  ['Indianapolis', 'IN', 5], ['Seattle', 'WA', 7], ['Denver', 'CO', 7], ['Washington', 'DC', 6], ['Boston', 'MA', 7], ['Nashville', 'TN', 5], ['Portland', 'OR', 5],
  ['Atlanta', 'GA', 7], ['Miami', 'FL', 6], ['Minneapolis', 'MN', 5], ['Detroit', 'MI', 4], ['Las Vegas', 'NV', 4], ['Baltimore', 'MD', 4], ['Milwaukee', 'WI', 3],
  ['Albuquerque', 'NM', 3], ['Tucson', 'AZ', 3], ['Sacramento', 'CA', 4], ['Kansas City', 'MO', 3], ['Raleigh', 'NC', 4], ['Omaha', 'NE', 2], ['Salt Lake City', 'UT', 3],
  ['Pittsburgh', 'PA', 3], ['Cincinnati', 'OH', 3], ['Orlando', 'FL', 4], ['Tampa', 'FL', 4], ['St. Louis', 'MO', 3], ['New Orleans', 'LA', 3], ['Cleveland', 'OH', 3],
  ['Richmond', 'VA', 2], ['Boise', 'ID', 2], ['Des Moines', 'IA', 2], ['Madison', 'WI', 2], ['Anchorage', 'AK', 1], ['Honolulu', 'HI', 2], ['Burlington', 'VT', 1],
  ['Providence', 'RI', 2], ['Hartford', 'CT', 2], ['Newark', 'NJ', 3], ['Spokane', 'WA', 1], ['Tulsa', 'OK', 2], ['Little Rock', 'AR', 1], ['Birmingham', 'AL', 2],
  ['Louisville', 'KY', 2], ['Memphis', 'TN', 2], ['Charleston', 'SC', 2], ['Fargo', 'ND', 1], ['Sioux Falls', 'SD', 1], ['Cheyenne', 'WY', 1], ['Billings', 'MT', 1],
  ['Portland', 'ME', 1], ['Manchester', 'NH', 1], ['Wilmington', 'DE', 1], ['Charleston', 'WV', 1], ['Jackson', 'MS', 1], ['Wichita', 'KS', 2],
];
export const COUNTRIES = [['United States', 55], ['United Kingdom', 8], ['Canada', 7], ['Germany', 6], ['India', 6], ['Australia', 4], ['France', 4], ['Brazil', 3],
  ['Netherlands', 2], ['Japan', 2], ['Singapore', 1], ['Spain', 2]];
