/** What to run in each Database Lab experiment. */
export const labToRun: Record<string, string> = {
  "create-table": "Run the script as written. It creates notes, then reads the table definition back from sqlite_master.",
  insert: "Run it to insert two rows, then add your own INSERT before the final SELECT.",
  update: "Run it once, then remove the WHERE clause and run again to see every row change.",
  delete: "Run it, then change the WHERE condition and watch which rows survive.",
  view: "Run it to create the view and query it like a table.",
  constraints: "Run the valid insert first, then choose “Try a duplicate tag” and run again.",
  transactions: "Run it, then change ROLLBACK to COMMIT and run again to compare the count.",
};

/** What the learner should see after running each experiment. */
export const labObservations: Record<string, string> = {
  "create-table": "The result shows the notes table name and its CREATE TABLE definition, including the primary key and required body.",
  insert: "The notes table contains two new rows: first note and second note.",
  update: "Only row 1 changes from draft to published; row 2 still says keep.",
  delete: "Only the row whose body says keep remains.",
  view: "The view returns only paid orders, with id, customer_id and quantity.",
  constraints: "The starter inserts one valid tag. Try a duplicate below to see the UNIQUE rule reject it.",
  transactions: "The remaining count is 0 because ROLLBACK undoes both inserted rows.",
};
