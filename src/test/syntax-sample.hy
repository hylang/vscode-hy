(defn greet [name] 
  "A simple greeting"
  (print "hello from hy," name))

(defmacro hello [person]
  `(print "Hello there," ~person))

(+ "hello " "world") ; = > "hello world"

(setv mylist [1 2 3 4])
(setv π 3.13159)

(defmacro example [#* args]
  (str (+ #* args)))

(setv dict {:a 1 :b 2 :c 3})
(get dict :a)
