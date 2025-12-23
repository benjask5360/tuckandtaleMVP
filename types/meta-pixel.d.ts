interface MetaPixelOptions {
  eventID?: string;
  test_event_code?: string;
}

interface Window {
  fbq?: (action: string, event: string, params?: Record<string, unknown>, options?: MetaPixelOptions) => void;
}
