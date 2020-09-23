CREATE TABLE IF NOT EXISTS email_messages(
    id integer PRIMARY KEY,
    snippet text,
    scanned_at datetime
);

CREATE TABLE IF NOT EXISTS urls(
    id integer PRIMARY KEY,
    is_file_url boolean,
    is_public_file_url boolean,
);