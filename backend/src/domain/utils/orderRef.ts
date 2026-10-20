export function generateNextMonzoReference(
  existingOrders: { id?: string; monzoReference?: string }[] = []
): string {
  const existingRefs = new Set<string>();
  for (const order of existingOrders) {
    if (order.id) existingRefs.add(order.id.toUpperCase());
    if (order.monzoReference) existingRefs.add(order.monzoReference.toUpperCase());
  }

  let counter = 1;
  while (true) {
    const formattedNum = String(counter).padStart(4, '0');
    const ref = `PRRC-${formattedNum}`;
    if (!existingRefs.has(ref)) {
      return ref;
    }
    counter++;
  }
}

export function generateNextChristmasTicketReference(
  existingOrders: { id?: string; monzoReference?: string }[] = [],
  year: number
): string {
  const existingRefs = new Set<string>();
  for (const order of existingOrders) {
    if (order.id) existingRefs.add(order.id.toUpperCase());
    if (order.monzoReference) existingRefs.add(order.monzoReference.toUpperCase());
  }

  let counter = 1;
  while (true) {
    const formattedNum = String(counter).padStart(4, '0');
    const ref = `PRRC-XMAS-${year}-${formattedNum}`;
    if (!existingRefs.has(ref)) {
      return ref;
    }
    counter++;
  }
}

