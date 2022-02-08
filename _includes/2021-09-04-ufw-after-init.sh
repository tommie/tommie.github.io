#!/bin/sh

set -e

get_ipXtables() {
    for exec in iptables ip6tables; do
        if "$exec" -n -L INPUT >/dev/null 2>&1; then
            echo "$exec"
        fi
    done
}

drycat() {
    echo "> $*"
    cat
}

prefix_for_exec() {
    local s=${1%tables}
    echo "ufw${s#ip}"
}

. "${rootdir}/etc/ufw/ufw.conf"

case "$1" in
start)
    drycat=
    [ "$DUFW_DRY_RUN" != yes ] || drycat=drycat

    for ipxtables in $(get_ipXtables); do
        (
            echo '*filter'

            # Links FORWARD to DOCKER-USER. Creates/flushes
            # DOCKER-USER as needed.
            if ! "$ipxtables" -C FORWARD -j DOCKER-USER >/dev/null 2>&1; then
                cat <<EOF
:DOCKER-USER - [0:0]
-I FORWARD -j DOCKER-USER
EOF
            elif [ "$MANAGE_BUILTINS" = yes ]; then
                cat <<EOF
:DOCKER-USER - [0:0]
EOF
            fi

            # We need to ensure this chain exists, but we can't flush
            # Docker-owned chains with ":chain - [0:0]".
            if ! "$ipxtables" -n -L DOCKER-ISOLATION-STAGE-1 >/dev/null 2>&1; then
                echo '-N DOCKER-ISOLATION-STAGE-1'
            fi

            # Not going to include the "6" in our chain name.
            cat <<EOF
:dufw-forward - [0:0]
-A DOCKER-USER -j dufw-forward
-A dufw-forward -j DOCKER-ISOLATION-STAGE-1
EOF

            # Copies the UFW rules from FORWARD to dufw-forward, and
            # removes them from FORWARD.
            "$ipxtables-save" \
                | sed -e 's/-A\( FORWARD\)\( -j ufw.*-forward\)$/-A dufw-forward\2\n-D\1\2/ p ; d'

            echo COMMIT
        ) | $drycat "$ipxtables-restore" -n
    done
    ;;

stop)
    drycat=
    [ "$DUFW_DRY_RUN" != yes ] || drycat=drycat

    for ipxtables in $(get_ipXtables); do
        (
            echo '*filter'
            echo ':dufw-forward - [0:0]'

            if [ "$MANAGE_BUILTINS" = yes ]; then
                echo '-D DOCKER-USER -j dufw-forward'
            fi
            echo COMMIT
        ) | $drycat "$ipxtables-restore" -n
    done
    ;;

status|flush-all)
    ;;

*)
    echo "$0: '$1' not supported" >&2
    exit 1
    ;;
esac
