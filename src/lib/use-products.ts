import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Fruit } from "@/lib/fruits";
import { listProducts } from "@/lib/server/shop";

let cache: { userId: string; products: Fruit[] } | null = null;

export function invalidateProductCache() {
  cache = null;
}

export function useProducts() {
  const { user, isPending } = useCurrentUserState();
  const [products, setProducts] = useState<Fruit[] | null>(
    user && cache?.userId === user.id ? cache.products : null,
  );

  useEffect(() => {
    if (!user) {
      setProducts([]);
      return;
    }
    if (cache && cache.userId === user.id) {
      setProducts(cache.products);
      return;
    }
    let alive = true;
    void listProducts()
      .then((rows) => {
        cache = { userId: user.id, products: rows };
        if (alive) setProducts(rows);
      })
      .catch(() => {
        if (alive) setProducts([]);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  return {
    products: products ?? [],
    loading: isPending || (Boolean(user) && products === null),
  };
}
