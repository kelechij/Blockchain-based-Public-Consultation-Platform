(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-CONSULTATION-CLOSED u101)
(define-constant ERR-ALREADY-SUBMITTED u102)
(define-constant ERR-INVALID-INPUT u103)
(define-constant ERR-NOT-FOUND u104)
(define-constant ERR-INVALID-DEADLINE u105)
(define-constant ERR-INVALID-TOPIC u106)
(define-constant ERR-INVALID-DESCRIPTION u107)
(define-constant ERR-INVALID-STATUS u108)
(define-constant ERR-VOTE-ALREADY-CAST u109)
(define-constant ERR-INVALID-VOTE u110)
(define-constant ERR-NOT-ELIGIBLE-TO-VOTE u111)
(define-constant ERR-INVALID-DIVERSITY-TAG u112)
(define-constant ERR-INTEGRATION-FAILED u113)
(define-constant ERR-INVALID-REWARD-POOL u114)
(define-constant ERR-CONSULTATION-NOT-ACTIVE u115)
(define-constant ERR-INVALID-SUBMISSION-HASH u116)
(define-constant ERR-DUPLICATE-HASH u117)
(define-constant ERR-INVALID-CATEGORY-TAGS u118)
(define-constant ERR-MAX-SUBMISSIONS-EXCEEDED u119)
(define-constant ERR-INVALID-UPDATE-PARAM u120)

(define-data-var consultation-id uint u0)
(define-data-var creator principal tx-sender)
(define-data-var topic (string-ascii 200) "")
(define-data-var description (string-ascii 1000) "")
(define-data-var deadline uint u0)
(define-data-var is-active bool true)
(define-data-var reward-pool uint u0)
(define-data-var submission-count uint u0)
(define-data-var max-submissions uint u1000)

(define-map submissions
  { user: principal }
  { input-hash: (buff 32), category-tags: (list 5 (string-ascii 50)), timestamp: uint, vote-count: uint, quality-score: uint })

(define-map submission-hashes (buff 32) bool)

(define-map votes
  { submission-user: principal, voter: principal }
  uint)

(define-map diversity-metrics (string-ascii 50) uint)

(define-read-only (get-consultation-details)
  (ok {
    id: (var-get consultation-id),
    creator: (var-get creator),
    topic: (var-get topic),
    description: (var-get description),
    deadline: (var-get deadline),
    is-active: (var-get is-active),
    reward-pool: (var-get reward-pool),
    submission-count: (var-get submission-count)
  })
)

(define-read-only (get-submission (user principal))
  (match (map-get? submissions { user: user })
    submission (ok submission)
    (err ERR-NOT-FOUND)
  )
)

(define-read-only (get-vote (submission-user principal) (voter principal))
  (ok (default-to u0 (map-get? votes { submission-user: submission-user, voter: voter })))
)

(define-read-only (get-diversity-metric (tag (string-ascii 50)))
  (ok (default-to u0 (map-get? diversity-metrics tag)))
)

(define-private (validate-topic (t (string-ascii 200)))
  (if (and (> (len t) u0) (<= (len t) u200))
    (ok true)
    (err ERR-INVALID-TOPIC))
)

(define-private (validate-description (d (string-ascii 1000)))
  (if (and (> (len d) u0) (<= (len d) u1000))
    (ok true)
    (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-deadline (dl uint))
  (if (> dl block-height)
    (ok true)
    (err ERR-INVALID-DEADLINE))
)

(define-private (validate-input-hash (h (buff 32)))
  (if (is-eq (len h) u32)
    (ok true)
    (err ERR-INVALID-SUBMISSION-HASH))
)

(define-private (validate-category-tags (tags (list 5 (string-ascii 50))))
  (if (and (<= (len tags) u5) (fold and-fold (map validate-tag tags) true))
    (ok true)
    (err ERR-INVALID-CATEGORY-TAGS))
)

(define-private (validate-tag (tag (string-ascii 50)))
  (and (> (len tag) u0) (<= (len tag) u50))
)

(define-private (validate-vote-value (v uint))
  (if (and (>= v u1) (<= v u5))
    (ok true)
    (err ERR-INVALID-VOTE))
)

(define-private (and-fold (a bool) (b bool)) (and a b))

(define-public (initialize-consultation (id uint) (new-topic (string-ascii 200)) (new-description (string-ascii 1000)) (new-deadline uint) (new-reward-pool uint))
  (begin
    (asserts! (is-eq tx-sender (var-get creator)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (var-get is-active)) (err ERR-CONSULTATION-NOT-ACTIVE))
    (try! (validate-topic new-topic))
    (try! (validate-description new-description))
    (try! (validate-deadline new-deadline))
    (asserts! (> new-reward-pool u0) (err ERR-INVALID-REWARD-POOL))
    (var-set consultation-id id)
    (var-set topic new-topic)
    (var-set description new-description)
    (var-set deadline new-deadline)
    (var-set reward-pool new-reward-pool)
    (var-set is-active true)
    (var-set submission-count u0)
    (ok true)
  )
)

(define-public (submit-input (input-hash (buff 32)) (category-tags (list 5 (string-ascii 50))))
  (let
    (
      (current-time block-height)
      (user tx-sender)
    )
    (asserts! (var-get is-active) (err ERR-CONSULTATION-CLOSED))
    (asserts! (< current-time (var-get deadline)) (err ERR-CONSULTATION_CLOSED))
    (asserts! (is-none (map-get? submissions { user: user })) (err ERR-ALREADY-SUBMITTED))
    (try! (validate-input-hash input-hash))
    (try! (validate-category-tags category-tags))
    (asserts! (not (default-to false (map-get? submission-hashes input-hash))) (err ERR-DUPLICATE-HASH))
    (asserts! (< (var-get submission-count) (var-get max-submissions)) (err ERR-MAX-SUBMISSIONS-EXCEEDED))
    (map-set submissions
      { user: user }
      { input-hash: input-hash, category-tags: category-tags, timestamp: current-time, vote-count: u0, quality-score: u0 }
    )
    (map-set submission-hashes input-hash true)
    (fold update-diversity category-tags (ok true))
    (var-set submission-count (+ (var-get submission-count) u1))
    (ok true)
  )
)

(define-private (update-diversity (tag (string-ascii 50)) (prev (response bool uint)))
  (let ((current (default-to u0 (map-get? diversity-metrics tag))))
    (map-set diversity-metrics tag (+ current u1))
    prev
  )
)

(define-public (cast-vote (submission-user principal) (vote uint))
  (let
    (
      (current-time block-height)
      (voter tx-sender)
      (sub-opt (map-get? submissions { user: submission-user }))
    )
    (asserts! (var-get is-active) (err ERR-CONSULTATION-CLOSED))
    (asserts! (< current-time (var-get deadline)) (err ERR-CONSULTATION_CLOSED))
    (asserts! (is-some sub-opt) (err ERR-NOT-FOUND))
    (asserts! (not (is-eq voter submission-user)) (err ERR-NOT-ELIGIBLE-TO-VOTE))
    (asserts! (is-none (map-get? votes { submission-user: submission-user, voter: voter })) (err ERR-VOTE-ALREADY-CAST))
    (try! (validate-vote-value vote))
    (let ((sub (unwrap! sub-opt (err ERR-NOT-FOUND))))
      (map-set submissions { user: submission-user }
        (merge sub { vote-count: (+ (get vote-count sub) u1), quality-score: (+ (get quality-score sub) vote) })
      )
    )
    (map-set votes { submission-user: submission-user, voter: voter } vote)
    (ok true)
  )
)

(define-public (close-consultation)
  (begin
    (asserts! (is-eq tx-sender (var-get creator)) (err ERR-NOT-AUTHORIZED))
    (asserts! (var-get is-active) (err ERR-CONSULTATION_NOT-ACTIVE))
    (var-set is-active false)
    (ok true)
  )
)

(define-public (update-reward-pool (new-pool uint))
  (begin
    (asserts! (is-eq tx-sender (var-get creator)) (err ERR-NOT-AUTHORIZED))
    (asserts! (var-get is-active) (err ERR_CONSULTATION_CLOSED))
    (asserts! (> new-pool (var-get reward-pool)) (err ERR_INVALID_UPDATE_PARAM))
    (var-set reward-pool new-pool)
    (ok true)
  )
)

(define-public (get-total-quality-score)
  (fold sum-quality (map-get? submissions) u0)
)

(define-private (sum-quality (entry { user: principal, details: { input-hash: (buff 32), category-tags: (list 5 (string-ascii 50)), timestamp: uint, vote-count: uint, quality-score: uint } }) (acc uint))
  (+ acc (get quality-score (get details entry)))
)