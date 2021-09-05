#!/bin/sh

set -e

#set -x
#exec 2>/tmp/ufw-after.init.log

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
    [ "$UFW_DRY_RUN" != yes ] || drycat=drycat
    [ "$UFW_DRY_RUN" != yes ] || dryecho=echo

    for ipxtables in $(get_ipXtables); do
        if [ "$MANAGE_BUILTINS" = yes ]; then
            if "$ipxtables" -n -L DOCKER-USER >/dev/null 2>&1; then
                $dryecho "$ipxtables" -F DOCKER-USER
            fi
        fi

        # Using iptables-restore to create these would
        # flush them even with --noflush.
        for auxchain in DOCKER-ISOLATION-STAGE-1 DOCKER; do
            if ! "$ipxtables" -n -L "$auxchain" >/dev/null 2>&1; then
                $dryecho "$ipxtables" -N "$auxchain"
            fi
        done

        # Copies UFW's FORWARD chain rules into chain
        # DOCKER-USER. Links FORWARD to DOCKER-USER.
        (
            echo '*filter'
            if ! "$ipxtables" -C FORWARD -j DOCKER-USER >/dev/null 2>&1; then
                cat <<EOF
:DOCKER-USER - [0:0]
-I FORWARD -j DOCKER-USER
EOF
            fi
            if ! "$ipxtables" -C DOCKER-USER -j DOCKER-ISOLATION-STAGE-1 >/dev/null 2>&1; then
                cat <<EOF
-I DOCKER-USER -j DOCKER
-I DOCKER-USER -j DOCKER-ISOLATION-STAGE-1
EOF
            fi

            if ! "$ipxtables" -C DOCKER-USER -j "$(prefix_for_exec "$ipxtables")-before-forward" >/dev/null 2>&1; then
                "$ipxtables-save" \
                    | sed -e 's/-A FORWARD\( -j ufw.*-forward\)$/-A DOCKER-USER\1/ p ; d'
            fi

            echo COMMIT
        ) | $drycat "$ipxtables-restore" -n

        # Removes the UFW rules from FORWARD. I.e. we have *moved*
        # them to DOCKER-USER.
        "$ipxtables-save" \
            | sed -e 's/^-A\( FORWARD -j ufw.*-forward\)$/-D\1/ p ; d' \
            | while read line; do
            eval $dryecho "$ipxtables" $line
        done

        # Removes the redundant RETURN Docker adds that will make
        # appending more difficult. If Docker re-appends it after our
        # rules, that's fine.
        if "$ipxtables" -C DOCKER-USER -j RETURN >/dev/null 2>&1; then
            $dryecho "$ipxtables" -D DOCKER-USER -j RETURN
        fi
    done
    ;;

stop)
    if [ "$MANAGE_BUILTINS" = yes ]; then
        dryecho=
        [ "$UFW_DRY_RUN" != yes ] || dryecho=echo
        for ipxtables in $(get_ipXtables); do
            "$ipxtables-save" \
                | sed -e 's/^-A\( DOCKER-USER -j ufw.*-forward\)$/-D\1/ p ; d' \
                | while read line; do
                eval $dryecho "$ipxtables" $line
            done
        done
    fi
    ;;

status|flush-all)
    ;;

*)
    echo "$0: '$1' not supported" >&2
    exit 1
    ;;
esac
