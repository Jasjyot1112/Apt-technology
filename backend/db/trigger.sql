-- Create the trigger function that emits a notification
CREATE OR REPLACE FUNCTION notify_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    payload = json_build_object(
      'operation', TG_OP,
      'data', row_to_json(OLD),
      'timestamp', CURRENT_TIMESTAMP
    );
  ELSE
    payload = json_build_object(
      'operation', TG_OP,
      'data', row_to_json(NEW),
      'timestamp', CURRENT_TIMESTAMP
    );
  END IF;

  -- Use pg_notify to send the payload to the 'order_changes' channel
  PERFORM pg_notify('order_changes', payload::text);

  RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to make the script idempotent
DROP TRIGGER IF EXISTS order_changes_trigger ON "orders";

-- Attach the trigger to the orders table
CREATE TRIGGER order_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON "orders"
FOR EACH ROW EXECUTE FUNCTION notify_order_changes();
