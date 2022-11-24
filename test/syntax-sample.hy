(defn greet [name] 
  "A simple greeting"
  (print "hello from hy," name)) ; Symbols just white

(defmacro hello [person]
  `(print "Hello there," ~person))

(+ "hello " "world") ; => "hello world"

(setv mylist [1 2 3 4])
(setv π 3.13159)

(defn nospace [arg] (+ 1 arg))
( defn withspace [arg] (+ 1 arg))

(defmacro nospace [arg] (+ 1 arg)) 
( defmacro nospace [arg] (+ 1 arg))

(str thing) ; Python built-ins not color-coding

(range 4 5) ; Python built-ins not color-coding

(defmacro example [#* args]
  (str (+ #* args)))

(setv dict {:a 1 :b 2 :c 3})
(get dict :a)
